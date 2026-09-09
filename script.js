/**
 * Simulador VisuAlg Mobile - Versão Completa (100 Questões)
 * Suporte: Estruturas de controle, Vetores, Procedimentos, Funções e Randi.
 */

function logOutput(msg) {
  const consoleEl = document.getElementById('console');
  consoleEl.innerText += msg + '\n';
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function limparConsole() {
  document.getElementById('console').innerText = '';
}

function renderizarTela() {
  return new Promise(resolve => setTimeout(resolve, 30));
}

async function executarAlgoritmo() {
  limparConsole();
  const rawCode = document.getElementById('code').value;
  const lines = rawCode.split('\n');

  let memoria = {};
  let procedimentos = {};
  let funcoes = {};

  let emBlocoInicio = false;
  let instrucoes = [];

  // Mapeia Declarações de Vetores, Procedimentos e Funções
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.startsWith("//") || line === "") continue;
    let lineLower = line.toLowerCase();

    // Identifica declaração de vetores na seção VAR
    if (!emBlocoInicio && lineLower.includes("vetor[")) {
      inicializarVetor(line, memoria);
      continue;
    }

    // Identifica início do bloco principal
    if (lineLower === "inicio" || lineLower.startsWith("inicio ")) {
      emBlocoInicio = true;
      continue;
    }

    if (lineLower.startsWith("fimalgoritmo")) break;

    // Registra Procedimentos e Funções
    if (!emBlocoInicio && lineLower.startsWith("procedimento ")) {
      i = registrarSubrotina(lines, i, procedimentos, "procedimento");
      continue;
    }

    if (!emBlocoInicio && lineLower.startsWith("funcao ")) {
      i = registrarSubrotina(lines, i, funcoes, "funcao");
      continue;
    }

    if (emBlocoInicio) {
      instrucoes.push(line);
    }
  }

  await executarBloco(instrucoes, memoria, procedimentos, funcoes);
}

/**
 * Inicializa estruturas de Vetores na memória
 */
function inicializarVetor(line, memoria) {
  let partes = line.split(":");
  let nomes = partes[0].split(",").map(s => s.trim());
  let def = partes[1].toLowerCase();

  let inicioIdx = Number(def.substring(def.indexOf("[") + 1, def.indexOf("..")));
  let fimIdx = Number(def.substring(def.indexOf("..") + 2, def.indexOf("]")));

  nomes.forEach(nome => {
    memoria[nome] = {};
    for (let k = inicioIdx; k <= fimIdx; k++) {
      memoria[nome][k] = 0;
    }
  });
}

/**
 * Registra Procedimentos e Funções
 */
function registrarSubrotina(lines, idxInicio, mapa, tipo) {
  let cabecalho = lines[idxInicio].trim();
  let nome = cabecalho.substring(tipo.length + 1, cabecalho.indexOf("(")).trim();
  let paramsStr = cabecalho.substring(cabecalho.indexOf("(") + 1, cabecalho.indexOf(")")).trim();
  
  let params = paramsStr ? paramsStr.split(",").map(p => p.split(":")[0].trim()) : [];
  let corpo = [];

  let idx = idxInicio + 1;
  let fimTag = "fim" + tipo;

  while (idx < lines.length) {
    let l = lines[idx].trim();
    if (l.toLowerCase().startsWith(fimTag)) break;
    if (!l.toLowerCase().startsWith("var") && !l.toLowerCase().startsWith("inicio")) {
      corpo.push(l);
    }
    idx++;
  }

  mapa[nome.toLowerCase()] = { params, corpo };
  return idx;
}

/**
 * Executor Principal do Bloco de Instruções
 */
async function executarBloco(instrucoes, memoria, procedimentos, funcoes) {
  let pc = 0;
  let limiteSeguranca = 20000;
  let passos = 0;

  while (pc < instrucoes.length) {
    passos++;
    if (passos > limiteSeguranca) {
      logOutput("[Erro]: Execução interrompida - Loop infinito detectado!");
      break;
    }

    let line = instrucoes[pc];
    let lineLower = line.toLowerCase();

    // --- SE / SENAO / FIMSE ---
    if (lineLower.startsWith("se ") && lineLower.includes("entao")) {
      let condicaoStr = line.substring(3, lineLower.indexOf("entao")).trim();
      let resultado = avaliarExpressao(condicaoStr, memoria, funcoes);

      if (resultado) {
        pc++;
      } else {
        pc = buscarProximoRamoSe(instrucoes, pc);
      }
      continue;
    }

    if (lineLower.startsWith("senao")) {
      pc = buscarFimBloco(instrucoes, pc, "se", "fimse") + 1;
      continue;
    }

    if (lineLower.startsWith("fimse")) {
      pc++;
      continue;
    }

    // --- PARA ... ATE ... FACA ---
    if (lineLower.startsWith("para ") && lineLower.includes("faca")) {
      let cabecalho = line.substring(5, lineLower.indexOf("faca")).trim();
      let partesDe = cabecalho.split(/\bde\b/i);
      let varNome = partesDe[0].trim();
      let partesAte = partesDe[1].split(/\bate\b/i);

      let inicioVal = Number(avaliarExpressao(partesAte[0].trim(), memoria, funcoes));
      let fimVal = Number(avaliarExpressao(partesAte[1].trim(), memoria, funcoes));

      if (!(varNome in memoria)) {
        memoria[varNome] = inicioVal;
      }

      if (memoria[varNome] <= fimVal) {
        pc++;
      } else {
        delete memoria[varNome];
        pc = buscarFimBloco(instrucoes, pc, "para", "fimpara") + 1;
      }
      continue;
    }

    if (lineLower.startsWith("fimpara")) {
      let pcPara = buscarInicioBloco(instrucoes, pc, "para", "fimpara");
      let linePara = instrucoes[pcPara];
      let varNome = linePara.substring(5, linePara.toLowerCase().indexOf("de")).trim();

      memoria[varNome] = Number(memoria[varNome]) + 1;
      pc = pcPara;
      continue;
    }

    // --- ENQUANTO ... FACA ---
    if (lineLower.startsWith("enquanto ") && lineLower.includes("faca")) {
      let condicaoStr = line.substring(9, lineLower.indexOf("faca")).trim();
      let resultado = avaliarExpressao(condicaoStr, memoria, funcoes);

      if (resultado) {
        pc++;
      } else {
        pc = buscarFimBloco(instrucoes, pc, "enquanto", "fimenquanto") + 1;
      }
      continue;
    }

    if (lineLower.startsWith("fimenquanto")) {
      pc = buscarInicioBloco(instrucoes, pc, "enquanto", "fimenquanto");
      continue;
    }

    // --- REPITA ... ATE ---
    if (lineLower.startsWith("repita")) {
      pc++;
      continue;
    }

    if (lineLower.startsWith("ate ")) {
      let condicaoStr = line.substring(4).trim();
      let resultado = avaliarExpressao(condicaoStr, memoria, funcoes);

      if (!resultado) {
        pc = buscarInicioBloco(instrucoes, pc, "repita", "ate");
      } else {
        pc++;
      }
      continue;
    }

    // --- ESCREVA / ESCREVAL ---
    if (lineLower.startsWith("escreval") || lineLower.startsWith("escreva")) {
      let inicioP = line.indexOf("(");
      let fimP = line.lastIndexOf(")");

      if (inicioP !== -1 && fimP !== -1) {
        let conteudo = line.substring(inicioP + 1, fimP).trim();
        let partes = quebrarArgumentos(conteudo);
        let saida = "";

        partes.forEach(p => {
          p = p.trim();
          if (p.startsWith('"') && p.endsWith('"')) {
            saida += p.slice(1, -1);
          } else {
            saida += avaliarExpressao(p, memoria, funcoes);
          }
        });

        logOutput(saida);
        await renderizarTela();
      }
      pc++;
      continue;
    }

    // --- LEIA ---
    if (lineLower.startsWith("leia")) {
      let inicioP = line.indexOf("(");
      let fimP = line.lastIndexOf(")");

      if (inicioP !== -1 && fimP !== -1) {
        let varTarget = line.substring(inicioP + 1, fimP).trim();
        await renderizarTela();
        
        let valor = prompt(`[VisuAlg Entrada]\nInforme o valor para '${varTarget}':`);

        if (valor !== null) {
          atribuirValor(varTarget, valor, memoria);
          logOutput(`> ${valor}`);
          await renderizarTela();
        }
      }
      pc++;
      continue;
    }

    // --- CHAMADA DE PROCEDIMENTO ---
    let procNome = line.split("(")[0].trim().toLowerCase();
    if (procedimentos[procNome]) {
      let proc = procedimentos[procNome];
      let argsStr = line.substring(line.indexOf("(") + 1, line.lastIndexOf(")")).trim();
      let args = argsStr ? quebrarArgumentos(argsStr) : [];

      let memLocal = Object.assign({}, memoria);
      proc.params.forEach((param, idx) => {
        memLocal[param] = avaliarExpressao(args[idx], memoria, funcoes);
      });

      await executarBloco(proc.corpo, memLocal, procedimentos, funcoes);
      pc++;
      continue;
    }

    // --- ATRIBUIÇÃO <- ---
    if (line.includes("<-")) {
      let partes = line.split("<-");
      let target = partes[0].trim();
      let expr = partes[1].trim();

      let valCalculado = expr.startsWith('"') && expr.endsWith('"') 
        ? expr.slice(1, -1) 
        : avaliarExpressao(expr, memoria, funcoes);

      atribuirValor(target, valCalculado, memoria);
      pc++;
      continue;
    }

    pc++;
  }
}

/**
 * Atribui valor em variáveis simples ou posições de vetores (ex: vet[i] <- 10)
 */
function atribuirValor(target, valor, memoria) {
  let valTratado = (isNaN(valor) || valor.toString().trim() === "") ? valor : Number(valor);

  if (target.includes("[")) {
    let nomeVetor = target.substring(0, target.indexOf("[")).trim();
    let idxExpr = target.substring(target.indexOf("[") + 1, target.indexOf("]")).trim();
    let idx = avaliarExpressao(idxExpr, memoria, {});

    if (!memoria[nomeVetor]) memoria[nomeVetor] = {};
    memoria[nomeVetor][idx] = valTratado;
  } else {
    memoria[target] = valTratado;
  }
}

// --- FUNÇÕES AUXILIARES ---

function buscarProximoRamoSe(instrucoes, pcInicio) {
  let nivel = 0;
  for (let i = pcInicio; i < instrucoes.length; i++) {
    let l = instrucoes[i].toLowerCase();
    if (l.startsWith("se ")) nivel++;
    if (l.startsWith("fimse")) {
      nivel--;
      if (nivel === 0) return i;
    }
    if (nivel === 1 && l.startsWith("senao")) return i + 1;
  }
  return instrucoes.length;
}

function buscarFimBloco(instrucoes, pcInicio, tagInicio, tagFim) {
  let nivel = 0;
  for (let i = pcInicio; i < instrucoes.length; i++) {
    let l = instrucoes[i].toLowerCase();
    if (l.startsWith(tagInicio)) nivel++;
    if (l.startsWith(tagFim)) {
      nivel--;
      if (nivel === 0) return i;
    }
  }
  return instrucoes.length;
}

function buscarInicioBloco(instrucoes, pcFim, tagInicio, tagFim) {
  let nivel = 0;
  for (let i = pcFim; i >= 0; i--) {
    let l = instrucoes[i].toLowerCase();
    if (l.startsWith(tagFim)) nivel++;
    if (l.startsWith(tagInicio)) {
      nivel--;
      if (nivel === 0) return i;
    }
  }
  return 0;
}

function avaliarExpressao(expr, memoria, funcoes) {
  let exprJS = expr.toString();

  // Suporte à função de sorteio randi(limite)
  exprJS = exprJS.replace(/randi\(([^)]+)\)/gi, (m, max) => {
    let limit = Number(eval(max));
    return Math.floor(Math.random() * limit);
  });

  // Substitui acessos a vetores ex: vet[i]
  exprJS = exprJS.replace(/([a-zA-Z0-9_]+)\[([^\]]+)\]/g, (m, vNome, vIdx) => {
    let idxVal = eval(vIdx);
    if (memoria[vNome] && memoria[vNome][idxVal] !== undefined) {
      let val = memoria[vNome][idxVal];
      return typeof val === 'string' ? `"${val}"` : val;
    }
    return 0;
  });

  // Converte operadores do VisuAlg para JavaScript
  exprJS = exprJS.replace(/\bmod\b/gi, '%')
                 .replace(/=/g, '==')
                 .replace(/<==/g, '<=')
                 .replace(/>==/g, '>=')
                 .replace(/<>/g, '!=')
                 .replace(/\be\b/gi, '&&')
                 .replace(/\bou\b/gi, '||')
                 .replace(/\bnao\b/gi, '!');

  // Substitui variáveis simples pelos valores
  Object.keys(memoria).forEach(v => {
    if (typeof memoria[v] !== 'object') {
      let regex = new RegExp('\\b' + v + '\\b', 'g');
      let val = memoria[v];
      if (typeof val === 'string') {
        exprJS = exprJS.replace(regex, `"${val}"`);
      } else {
        exprJS = exprJS.replace(regex, val);
      }
    }
  });

  try {
    return Function('"use strict"; return (' + exprJS + ')')();
  } catch (err) {
    return expr;
  }
}

function quebrarArgumentos(str) {
  let resultado = [];
  let atual = '';
  let emAspas = false;

  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    if (char === '"') emAspas = !emAspas;

    if (char === ',' && !emAspas) {
      resultado.push(atual);
      atual = '';
    } else {
      atual += char;
    }
  }
  if (atual) resultado.push(atual);
  return resultado;
}
