// Mostra a prévia do e-mail recebida no endereço (#base64url do HTML). O HTML roda dentro de um iframe com
// sandbox vazio (sem scripts, sem acesso ao site): mesmo um endereço montado por terceiros não faz nada além de mostrar.
(function () {
  var h = location.hash.slice(1);
  var aviso = document.getElementById("aviso");
  try {
    var b = atob(h.replace(/-/g, "+").replace(/_/g, "/"));
    var bytes = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
    document.getElementById("mail").srcdoc = new TextDecoder().decode(bytes);
  } catch (e) {
    aviso.textContent = "Não foi possível abrir a prévia. Volte ao VEOS e clique de novo.";
  }
})();
