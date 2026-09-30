# Motor CFO portátil

`cfo.py` é uma cópia idêntica do motor existente, incluída para permitir a migração do portal sozinho.
`fixtures/cfo-demo.json` contém exclusivamente projetos e entidades fictícias, identificados como TESTE.

SHA256 do motor: `f29ff096133dbbb14e214eb9758b530454484f629e06af03b9ec0931bcdc5017`.
SHA256 da fixture: `729ef890722364ec2e2f0d92b5b1ae48e830f8b8b87db8c5412f612f8d784b20`.

`fixtures/cfo-controles-TESTE.json` é a base **somente TESTE** da camada de controles do portal
(`veosportal/cfo_controls.py`, `cfo_indicadores.py`); não é lida pelo motor e não altera a fixture
original. Os hashes acima são conferidos por `tests/test_cfo_controls.py`.

A ponte chama apenas a validação e a análise. Não lê as políticas canônicas nem consulta Zoho.
Ao atualizar o motor, repetir os testes do CFO e os testes de integração antes de substituir esta cópia.
