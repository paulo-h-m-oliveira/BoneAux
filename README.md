# BoneAux - Web DAW & AI Stem Separator

BoneAux é uma Estação de Áudio Digital (DAW) completa e 100% executada no navegador. O projeto foi arquitetado para lidar tanto com manipulação de áudio bruto (separação de faixas via Inteligência Artificial) quanto com sequenciamento e partituras virtuais (MIDI), sem a necessidade de um servidor backend pesado.

## 🚀 Principais Funcionalidades

1. **Importação e Reprodução MIDI**: Leia arquivos `.mid` comerciais. O sistema detecta os instrumentos originais, o BPM e monta as trilhas separadamente.
2. **Separação de Áudio por IA (Demucs)**: Importe um `.mp3` ou `.wav` comum. O BoneAux fará o download local do modelo neural (*HTDemucs* através do ONNX) e usará a placa de vídeo do usuário para dividir a música em 4 caules (Stems): **Voz, Bateria, Baixo e Outros**.
3. **Console Mixer Profissional**: Controle individual de volume, *mute* e substituição de instrumentos em tempo real para cada trilha importada (seja áudio ou MIDI).
4. **Gerador de Partituras Interativas**: Qualquer arquivo MIDI lido é automaticamente transcrito para partitura musical visual utilizando renderização VexFlow, permitindo acompanhar as notas enquanto a música toca.
5. **Manipulação de Tempo e Afinação**: Altere a velocidade da música (BPM) ou a afinação global (Pitch Shift) sem distorcer os canais e exporte o resultado final renderizado.

## 🛠️ Stack Tecnológico e Bibliotecas Essenciais

O projeto é construído sobre o ecossistema moderno do **React** empacotado com **Vite**, sendo fortemente tipado com **TypeScript** e estilizado com **TailwindCSS** + **Lucide React** (ícones).

### Bibliotecas de Áudio e Música
A mágica acontece utilizando as seguintes bibliotecas especializadas:

*   **[Tone.js](https://tonejs.github.io/)** (`tone`): 
    *   **O que faz:** É o coração do sistema. Um wrapper ultra avançado da *Web Audio API* nativa do navegador. Ele gerencia o relógio global (Transport), os roteamentos de áudio, os nós de ganho (Gain), mudança de pitch (PitchShift) e o player de buffers offline para exportação.
*   **[@tonejs/midi](https://github.com/Tonejs/Midi)** (`@tonejs/midi`): 
    *   **O que faz:** Converte o binário puro de arquivos `.mid` em um objeto JSON amigável no JavaScript. É ele que extrai a lista de notas, duração, compasso e velocidade para alimentarmos a renderização da partitura.
*   **[Soundfont-Player](https://github.com/danigb/soundfont-player)** (`soundfont-player`): 
    *   **O que faz:** Ao invés de usar sintetizadores eletrônicos (bipes) para tocar os arquivos MIDI, essa biblioteca baixa pequenas amostras reais (Soundfonts MP3) de pianos, guitarras, e violinos para gerar um som realista na reprodução das partituras.
*   **[OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/)** (`opensheetmusicdisplay`): 
    *   **O que faz:** Uma biblioteca complexa que traduz XML musical e informações de pauta para partituras desenhadas no Canvas do navegador (baseado no VexFlow). É utilizada no componente `ScoreManager` para desenhar as notas.
*   **[Demucs Web](https://github.com/timcsy/demucs-web)** (`demucs-web` & `onnxruntime-web`): 
    *   **O que faz:** Motor de Inteligência Artificial para extração de instrumentos (Source Separation). O `onnxruntime-web` cria a ponte para a placa de vídeo (via WebAssembly/WebGPU) para calcular e separar ondas sonoras matematicamente na máquina do cliente.

## 🏗️ Arquitetura do Código

Para manter o ecossistema React limpo enquanto o Web Audio API trabalha em segundo plano, adotamos a seguinte separação de responsabilidades:

1. **`src/lib/AudioEngine.ts`**: Uma classe *Singleton* que controla o relógio master e conexões de saída globais (Master Volume, Metrônomo, Pause/Play e Mute geral). Por ser Singleton, ele não sofre com os re-renders do React e garante que o áudio não engasgue.
2. **Hooks de Estado** (`useAudioEngine`, `useMultiSoundfont`, `useAudioStems`, `useDemucs`): Hooks customizados que servem de ponte entre a lógica crua de áudio (Tone.js) e o ciclo de vida dos componentes do React (UI). Eles sincronizam as referências de buffer com o estado visual dos sliders de volume.
3. **`PlayerModule.tsx`**: O hub principal da DAW. Ele lida com o arrastar/soltar de arquivos, toma a decisão de direcionar um MP3 para a IA (Demucs) ou um arquivo MIDI para a conversão de Soundfonts, monta a lista de "Tracks" e re-renderiza o mixer.
4. **`ScoreManager.tsx`**: Focado estritamente na interface e lógica da Partitura.

## 🏃 Como rodar o projeto localmente

Instale as dependências:
```bash
npm install
```

Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Para gerar a build de produção:
```bash
npm run build
```

*(Obs: Dependendo das configurações de servidor onde isso for hospedado, certifique-se de configurar os headers `Cross-Origin-Opener-Policy` caso os Worklets de áudio e as threads do WebAssembly (ONNX) precisem de buffers de memória compartilhada para alta performance).*
