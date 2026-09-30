// Onda de voz estilo Siri em WebGL puro (sem biblioteca). Porte do shader "wave"
// de siriWaveCore, com duas mudancas: cores da marca (ouro -> ciano) e o uniforme
// uEnergia (0 = repouso, 1 = ouvindo) que controla amplitude e brilho.

const VERT = "attribute vec2 aPos; void main(){ gl_Position=vec4(aPos,0.0,1.0); }";

const FRAG = `precision highp float;
uniform vec2 iResolution; uniform float iTime; uniform float uEnergia;
const float PI = 3.14159265359;
const float AMPLITUDE = 0.32; const float FREQ = 1.1; const float ABER_FREQ = 1.0;
const float SPEED = 2.4; const float WAVE_SCALE = 0.6; const float ABERRATION = 2.6;
const float THICKNESS = 3.0; const float INTENSITY = 2.0; const float FALLOFF = 1.7;
const float EDGE_MASK = 0.4; const float BAND_FILL = 30000.0; const float BAND_THICK = 0.08;
const float SOFTNESS = 2.5; const float LOW_AMP = 6.0; const float LOW_INT = 1.5;
const float MID_ABER = 0.8; const float MID_ABAMP = 0.05; const float MID_SOFT = 0.4;
const float HIGH_ABER = 0.5; const float HIGH_ABAMP = 0.06;

vec3 spectral4(int s){
  float x = float(s);
  return clamp(vec3(abs(x-3.0)-1.0, 2.0-abs(x-2.0), 2.0-abs(x-4.0)), 0.0, 1.0);
}

void main(){
  vec2 R = iResolution.xy;
  float aspect = R.x / R.y;
  vec2 p = (gl_FragCoord.xy + 0.5) * 2.0 / R - 1.0;
  p.x *= aspect;
  float yScreen = p.y;
  p /= WAVE_SCALE;
  float t = iTime;
  float e = clamp(uEnergia, 0.0, 1.0);
  float low  = clamp(0.45 + 0.45*sin(t*0.8)*sin(t*0.37+1.0), 0.0, 1.0);
  float mid  = clamp(0.40 + 0.40*sin(t*1.7+2.0)*sin(t*0.53), 0.0, 1.0);
  float high = clamp(0.30 + 0.30*sin(t*2.9+4.0)*sin(t*0.71+2.0), 0.0, 1.0);
  float drift = mod(t, 20.0*PI) * SPEED * (0.55 + 0.45*e);
  float xN  = p.x / max(aspect, 1.0);
  float env = cos(PI*0.5 * min(abs(0.9*xN), 1.0)); env *= env;
  float amp = mix(0.28, 1.0, e);
  float A1 = (AMPLITUDE + 0.01*low*LOW_AMP) * amp;
  float A2 = A1 + (mid*MID_ABAMP + high*HIGH_ABAMP) * amp;
  float AB = ABERRATION + mid*MID_ABER + high*HIGH_ABER;
  float th = 0.01*THICKNESS;
  float inten = 0.01*(INTENSITY + low*LOW_INT) * mix(0.6, 1.0, e);
  float soft = 0.01*max(0.0, SOFTNESS + mid*MID_SOFT);
  float yMain = A1 * env * sin(p.x*FREQ + drift);
  float bandAmt = 1e-4 * BAND_FILL * inten;
  vec3 num = vec3(0.0), den = vec3(0.0);
  for(int s = 0; s < 4; s++){
    vec3 hue = spectral4(s);
    den += hue;
    float ab = mix(-AB, AB, float(s)/3.0);
    float yL = A2 * env * sin(p.x*ABER_FREQ + drift + ab);
    float d = abs(p.y - yL);
    float line = inten / (sqrt(d*d + soft*soft) + th);
    float lo = min(yMain, yL), hi = max(yMain, yL);
    float dBand = max(0.0, max(p.y - hi, lo - p.y));
    float band = bandAmt / (dBand + BAND_THICK);
    num += hue * (line + band);
  }
  vec3 col = num / den;
  float dM = abs(p.y - yMain);
  col += 0.5 * inten / (sqrt(dM*dM + soft*soft) + th);
  col = pow(max(col, 0.0), vec3(1.5));
  float emT = clamp((abs(yScreen) - 1.0) / (-EDGE_MASK), 0.0, 1.0);
  float em = emT*emT*(3.0 - 2.0*emT);
  col *= em * exp(-pow(xN*FALLOFF, 2.0));
  // cores da marca: ouro a esquerda, ciano a direita, nucleo quente
  vec3 ouro = vec3(0.95, 0.76, 0.38), ciano = vec3(0.43, 0.84, 0.92);
  vec3 tinta = mix(ouro, ciano, smoothstep(-0.9, 0.9, xN));
  float lum = dot(col, vec3(0.3, 0.5, 0.2));
  col = mix(col * 0.35, tinta * lum * 1.6, 0.8) + vec3(pow(lum, 3.0)) * 0.25;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Monta a onda no canvas. Retorna {definirEnergia(0..1)} ou null sem WebGL. */
export function montarOnda(canvas, signal, { escala = 0.75 } = {}) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const compilar = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  let prog, vs, fs;
  try {
    prog = gl.createProgram();
    vs = compilar(gl.VERTEX_SHADER, VERT);
    fs = compilar(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
  } catch (e) {
    console.error("onda:", e);
    return null;
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "iResolution");
  const uTempo = gl.getUniformLocation(prog, "iTime");
  const uEnergia = gl.getUniformLocation(prog, "uEnergia");

  let alvo = 0, energia = 0, quadro = 0, anterior = performance.now();
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inicio = performance.now();

  function medir() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr * escala));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr * escala));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  function desenhar(agora) {
    const dt = Math.min(50, agora - anterior);
    anterior = agora;
    energia += (alvo - energia) * Math.min(1, dt / 220);
    medir();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTempo, reduzido ? 3.0 : (agora - inicio) / 1000);
    gl.uniform1f(uEnergia, energia);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    quadro = requestAnimationFrame(desenhar);
  }
  const visivel = () => {
    cancelAnimationFrame(quadro);
    if (!document.hidden) {
      anterior = performance.now();
      quadro = requestAnimationFrame(desenhar);
    }
  };
  document.addEventListener("visibilitychange", visivel);
  quadro = requestAnimationFrame(desenhar);
  signal.addEventListener("abort", () => {
    cancelAnimationFrame(quadro);
    document.removeEventListener("visibilitychange", visivel);
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteBuffer(buf);
  });
  return { definirEnergia: (v) => { alvo = Math.max(0, Math.min(1, v)); } };
}
