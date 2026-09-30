"""Montagem do portal: store + provedor + orquestrador + ponte CFO + HTTP."""
from .cfo_bridge import CFOBridge
from .cfo_context import CFOContextBuilder
from .cfo_service import CFOControlsService
from .config import Config
from .http_app import PortalServer
from .integrations import IntegrationService
from .ledger import DecisionLedger
from .orchestration import Orchestrator
from .provider import ClaudeCodeProvider, resolve_claude_bin
from .store import Store


def build_server(config=None, provider=None, store=None, integrations=None):
    config = config or Config()
    if config.host != "127.0.0.1":
        raise ValueError("o portal so escuta em 127.0.0.1")
    owns_store = store is None
    if owns_store:
        config.runtime_dir.mkdir(parents=True, exist_ok=True)
        store = Store(config.db_path)
    if provider is None:
        provider = ClaudeCodeProvider(resolve_claude_bin(config.claude_bin), config.project_dir,
                                      config.provider_timeout_s)
    controls = CFOControlsService(config, store)
    if integrations is None:
        # Mesmo executavel do provedor; nada e executado ate o usuario pedir uma verificacao.
        integrations = IntegrationService(store, getattr(provider, "claude_bin", None),
                                          config.project_dir, config.integration_health_timeout_s,
                                          config.integration_probe_timeout_s)
    orch = Orchestrator(store, provider, config,
                        context_for=CFOContextBuilder(config, controls, integrations))
    try:
        server = PortalServer(config, store, orch, CFOBridge(config, store), provider)
    except OSError:
        orch.shutdown()
        integrations.shutdown()
        if owns_store:
            store.close()
        raise
    server.controls = controls
    server.integrations = integrations
    server.ledger = DecisionLedger(store, controls.snapshot)
    # So a instancia que obteve a porta pode interromper jobs de uma execucao antiga.
    server.interrupted_jobs = store.fail_interrupted_jobs()
    return server
