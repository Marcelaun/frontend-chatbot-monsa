import React, { useState, useEffect, useRef } from 'react';
import { Send, Camera, Check, X, UserCircle2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

let groq_api_key = '';
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    groq_api_key = import.meta.env.VITE_GROQ_API_KEY || '';
  }
} catch (e) {
  console.warn("Ambiente não suporta import.meta nativamente.");
}

const CONFIG = {
  logoUrl: 'https://ui-avatars.com/api/?name=OSC+MONSA&background=3c6bee&color=fff', 
  nomeOng: 'OSC MONSA',
  siglaOng: 'OM',
  corPrincipalHex: '#3c6bee',
  groqApiKey: groq_api_key
};

// Adicionei algumas opções fictícias comuns em ONGs. Pode alterar os textos à vontade.
const FLOW_SEQUENCE = [
  { id: 'nome_responsavel', question: `Olá! Sou o assistente virtual do Centro Cultural ${CONFIG.nomeOng}. Primeiramente, com quem eu estou falando?`, type: 'form', fields: [{ id: 'nome', label: 'Seu Nome Completo', placeholder: 'Digite seu nome' }] },
  { id: 'nome_inscrito', question: (data) => `Prazer em te conhecer, ${data?.nome_responsavel || ''}! Qual é o nome completo da pessoa que será inscrita?`, type: 'form', fields: [{ id: 'nome', label: 'Nome do Inscrito', placeholder: 'Nome completo' }]},
  { id: 'data_nasc', question: 'Qual a data de nascimento do inscrito?', type: 'form', fields: [{ id: 'data', label: 'Data de Nascimento', placeholder: 'DD/MM/AAAA', mask: 'date' }]},
  { id: 'telefone', question: 'Por favor, me informe o seu número de WhatsApp com DDD.', type: 'form', fields: [{ id: 'telefone', label: 'WhatsApp', placeholder: '(00) 00000-0000', mask: 'phone' }]},
  { id: 'endereco', question: 'Certo. Qual é o endereço completo? Rua, Número e Bairro.', type: 'form', fields: [{ id: 'endereco', label: 'Endereço', type: 'textarea', placeholder: 'Rua, Número, Bairro' }]},
  { id: 'rg_cpf', question: 'Agora preciso dos números de RG e CPF do inscrito.', type: 'form', fields: [{ id: 'rg', label: 'Número do RG', placeholder: 'Apenas números', mask: 'rg' }, { id: 'cpf', label: 'Número do CPF', placeholder: '000.000.000-00', mask: 'cpf' }]},
  { id: 'filiacao', question: 'Qual o nome da Filiação (Pai, Mãe ou Responsável) e o CPF do responsável?', type: 'form', fields: [{ id: 'nome', label: 'Nome da Mãe/Pai ou Responsável', placeholder: 'Nome completo' }, { id: 'cpf', label: 'CPF do Responsável', placeholder: '000.000.000-00', mask: 'cpf' }]},
  { id: 'escolaridade', question: 'Sobre a escolaridade do inscrito: Qual o Ano, Turno e Escola?', type: 'form', fields: [{ id: 'ano', label: 'Série/Ano', placeholder: 'Ex: 5º Ano' }, { id: 'turno', label: 'Turno', placeholder: 'Ex: Matutino' }, { id: 'escola', label: 'Nome da Escola', placeholder: 'Ex: Escola Municipal...' }]},
  { id: 'familiares', question: 'Quais pessoas moram na mesma casa? (Escreva UMA PESSOA POR LINHA).\n\nInforme 5 dados separados por traço:\nNome - Parentesco - Idade - Escolaridade - Ocupação\n\nExemplo:\nMaria - Mãe - 35 anos - Ensino Médio - Vendedora\nMarcelo - Pai - 40 anos - Superior - Pedreiro', type: 'form', fields: [{ id: 'familiares', label: 'Moradores da residência', type: 'textarea', placeholder: 'Ex:\nMaria - Mãe - 35 anos - Médio - Vendedora\nMarcelo - Pai - 40 anos - Superior - Pedreiro' }]},
  { id: 'renda_auxilio', question: 'Qual a renda mensal da família e recebem algum auxílio do governo?', type: 'form', fields: [{ id: 'renda', label: 'Renda Mensal', placeholder: 'R$ 0,00', mask: 'money' }, { id: 'auxilio', label: 'Auxílio do Governo', placeholder: 'Ex: Bolsa Família ou "Nenhum"' }]},
  { id: 'saude', question: 'Alguém na família toma algum remédio controlado ou precisa de atenção à saúde?', type: 'form', fields: [{ id: 'saude', label: 'Atenção à saúde', type: 'textarea', placeholder: 'Descreva ou digite "Não"' }]},
  { id: 'oficina', question: 'Qual a opção de oficina/atividade que o inscrito deseja participar?\n\nOpções disponíveis no momento:\n- Futsal\n- Capoeira\n- Reforço Escolar\n- Aulas de Música\n- Informática Básica', type: 'form', fields: [{ id: 'oficina', label: 'Oficina Desejada', placeholder: 'Digite a oficina escolhida' }]},
  { id: 'expectativa', question: `Qual a sua expectativa no trabalho da ${CONFIG.nomeOng} com seu filho ou filha?`, type: 'form', fields: [{ id: 'expectativa', label: 'Sua expectativa', type: 'textarea', placeholder: 'Digite sua expectativa' }]},
  { id: 'horta', question: 'A família tem horta ou árvore frutífera em casa?', type: 'options', options: ['Sim, temos', 'Não temos, mas tenho interesse', 'Não temos e sem interesse'] },
  { id: 'cursos', question: 'Quais cursos de interesse você (responsável) tem vontade de fazer?\n\nAlgumas opções que pretendemos oferecer:\n- Corte e Costura\n- Padaria/Culinária\n- Empreendedorismo\n- Alfabetização de Adultos', type: 'form', fields: [{ id: 'cursos', label: 'Cursos de interesse', placeholder: 'Ex: Corte e Costura, Informática...' }]},
  { id: 'foto_doc', question: 'Quase lá! Por favor, tire uma foto do documento, RG ou CPF, ou escolha na galeria.', type: 'file', accept: 'image/*' },
  { id: 'foto_crianca', question: 'Ótimo! Agora, por favor, envie a foto da criança inscrita.', type: 'file', accept: 'image/*' }
];

export default function App() {
  const [screen, setScreen] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  
  // Estado para controlar a voz do Bot
  const [isVoiceBotEnabled, setIsVoiceBotEnabled] = useState(false);

  const messagesEndRef = useRef(null);

  // Função para o bot falar (TTS)
  const speakText = (text) => {
    if (!isVoiceBotEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Para qualquer fala anterior
    
    // Remove emojis e markdown simples para a leitura ficar limpa
    const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{2700}-\u{27BF}]/gu, '').replace(/\*/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05; // Velocidade ligeiramente mais rápida e natural
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (messages.length === 0) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setIsTyping(false);
        const firstQ = FLOW_SEQUENCE[0].question;
        addBotMessage(typeof firstQ === 'function' ? firstQ({}) : firstQ);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStep, isTyping]);

  const addBotMessage = (text) => {
    setMessages((prev) => [...prev, { sender: 'bot', text }]);
    speakText(text); // Aciona a voz sempre que o bot envia mensagem
  };

  const addUserMessage = (text) => setMessages((prev) => [...prev, { sender: 'user', text }]);

  const toggleBotVoice = () => {
    const newState = !isVoiceBotEnabled;
    setIsVoiceBotEnabled(newState);
    if (!newState) {
      window.speechSynthesis.cancel(); // Cala a boca do bot se o usuário desligar
    } else {
      // Pequeno feedback avisando que ligou
      const utterance = new SpeechSynthesisUtterance("Voz ativada.");
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
    }
  };

  const validateWithLLM = async (question, answer, expectedType) => {
    if (!CONFIG.groqApiKey) return { valid: true, extracted_value: answer };
    try {
      const prompt = `Você é um assistente de extração de dados.
Pergunta do bot: "${question}"
Resposta do usuário: "${answer}"
Tipo esperado: ${expectedType}

Regras OBRIGATÓRIAS:
1. Se o usuário digitar/falar um valor direto (ex: só o nome, só a data), considere VÁLIDO, procure na frase o nome do usuário se achar considere VÁLIDO pode ser entre o que o usuário digitar no começo ou depois de apresentações etc. apenas foque no nome e extraia o valor.
2. Extraia o dado limpo em "extracted_value".
3. Invalide APENAS se for uma recusa clara, sem sentido ou se não responder ao pedido.
4. Retorne APENAS um JSON válido.
Exemplo: { "valid": true, "extracted_value": "valor extraído", "error_message": null }`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CONFIG.groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: "json_object" }, temperature: 0.1 })
      });
      if (!response.ok) return { valid: true, extracted_value: answer };
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch {
      return { valid: true, extracted_value: answer }; 
    }
  };

  const handleNextStep = async (answerText, valueToSave, skipValidation = false) => {
    const stepData = FLOW_SEQUENCE[currentStep];
    addUserMessage(answerText);
    setIsTyping(true);

    let finalValueToSave = valueToSave;

    if (!skipValidation) {
      const questionText = typeof stepData.question === 'function' ? stepData.question(formData) : stepData.question;
      const expectedType = stepData.type === 'form' ? `Form: ${stepData.fields.map(f => f.label).join(', ')}` : stepData.type;
      const validationResult = await validateWithLLM(questionText, answerText, expectedType);
      
      if (!validationResult.valid) {
        setIsTyping(false);
        addBotMessage(`Hmm, acho que precisamos corrigir isso 🤔\n\n${validationResult.error_message}`);
        return; 
      }
      
      // TRAVA DE SEGURANÇA: Se a IA não devolver um texto limpo ou devolver um Array/Objeto escondido, ignoramos a IA e usamos a resposta crua!
      let extracted = validationResult.extracted_value;
      if (typeof extracted !== 'string' || extracted.trim() === '') {
         extracted = (typeof valueToSave === 'string') ? valueToSave : answerText;
      }
      finalValueToSave = (stepData.type === 'form' && stepData.fields.length > 1) ? valueToSave : extracted;
    }

    const newFormData = { ...formData, [stepData.id]: finalValueToSave };
    setFormData(newFormData);
    const nextStep = currentStep + 1;

    if (nextStep < FLOW_SEQUENCE.length) {
      setCurrentStep(nextStep);
      setTimeout(() => {
        setIsTyping(false);
        const nextQ = FLOW_SEQUENCE[nextStep].question;
        addBotMessage(typeof nextQ === 'function' ? nextQ(newFormData) : nextQ);
      }, 1000); 
    } else {
      setTimeout(() => {
        setIsTyping(false);
        addBotMessage(`Tudo certo com as informações e fotos, ${newFormData?.nome_responsavel || ''}! 🎉\n\nAviso Importante: Este é um pré-cadastro. Será necessária a presença do responsável na sede para assinar presencialmente.`);
        setTimeout(() => finishCadastro(newFormData), 6000);
      }, 1000);
    }
  };

  const generateXML = (data) => {
    const escapeXml = (str) => String(str || '').replace(/[<>&'"]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;'}[c]));
    
    // Função extratora segura contra objetos/arrays indesejados
    const getVal = (field, key) => {
      if (typeof field === 'string') return field;
      if (Array.isArray(field)) return field.join(', ');
      if (typeof field === 'object' && field !== null) return field[key] || '';
      return '';
    };

    const familiaresTexto = getVal(data.familiares, 'familiares') || '';
    const familiaresLinhas = familiaresTexto.split('\n').filter(line => line.trim() !== '');
    const familiaresXml = familiaresLinhas.map(linha => `<membro nome="${escapeXml(linha)}" parentesco="" dataNasc="" escolaridade="" ocupacao="" />`).join('\n            ');

    const nomeCrianca = getVal(data.nome_inscrito, 'nome') || 'Sem_Nome';

    return `<?xml version="1.0" encoding="UTF-8"?>
<cadastro>
    <ficha>
        <inscrito>
            <nome>${escapeXml(nomeCrianca)}</nome>
            <dataNascimento>${escapeXml(getVal(data.data_nasc, 'data'))}</dataNascimento>
            <telefone>${escapeXml(getVal(data.telefone, 'telefone'))}</telefone>
            <endereco>${escapeXml(getVal(data.endereco, 'endereco'))}</endereco>
            <rg>${escapeXml(data.rg_cpf?.rg)}</rg>
            <cpf>${escapeXml(data.rg_cpf?.cpf)}</cpf>
            <filiacao>${escapeXml(data.filiacao?.nome)} / CPF: ${escapeXml(data.filiacao?.cpf)}</filiacao>
            <escolaridade>${escapeXml(data.escolaridade?.ano)}, ${escapeXml(data.escolaridade?.turno)}, ${escapeXml(data.escolaridade?.escola)}</escolaridade>
        </inscrito>
        <familiares>
            ${familiaresXml}
        </familiares>
        <socioeconomico>
            <rendaMensal>${escapeXml(data.renda_auxilio?.renda)}</rendaMensal>
            <auxilio>${escapeXml(data.renda_auxilio?.auxilio)}</auxilio>
            <saudeFamiliar>${escapeXml(getVal(data.saude, 'saude'))}</saudeFamiliar>
            <oficinaDesejada>${escapeXml(getVal(data.oficina, 'oficina'))}</oficinaDesejada>
            <expectativa>${escapeXml(getVal(data.expectativa, 'expectativa'))}</expectativa>
            <temHorta>${escapeXml(data.horta)}</temHorta>
            <interesseHorta>${escapeXml(data.horta)}</interesseHorta>
            <cursosInteresse>${escapeXml(getVal(data.cursos, 'cursos'))}</cursosInteresse>
        </socioeconomico>
    </ficha>
</cadastro>`;
  };

  const finishCadastro = async (finalData) => {
    setScreen('loading'); 
    try {
      const xmlDocument = generateXML(finalData);
      // Extração robusta do nome para a pasta
      const getVal = (field, key) => {
        if (typeof field === 'string') return field;
        if (typeof field === 'object' && field !== null) return field[key] || '';
        return '';
      };
      const nomeCriancaStr = getVal(finalData.nome_inscrito, 'nome') || 'Inscrito_Novo';

      const payload = {
        nome_arquivo: `Cadastro_${nomeCriancaStr.replace(/\s+/g, '_')}.xml`,
        nome_crianca: nomeCriancaStr,
        xml_data: xmlDocument,
        foto_documento_base64: finalData.foto_doc,
        foto_crianca_base64: finalData.foto_crianca,
        telefone_contato: getVal(finalData.telefone, 'telefone')
      };

      const WEBHOOK_URL = 'https://autobackend.duckdns.org/webhook-test/monsa-cadastro';
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Erro: ${response.status}`);
      setScreen('success');
    } catch (error) {
      alert('Falha ao conectar. Verifique a rede.');
      setScreen('chat'); 
    }
  };

  const handleOptionSelect = (option) => handleNextStep(option, option, true);
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleNextStep(`📷 Arquivo anexado: ${file.name}`, reader.result, true);
    reader.readAsDataURL(file);
  };

  // Estilos globais essenciais (Loader e Animações)
  const GlobalStyles = () => (
    <style>{`
      .animate-fade-in{animation: fadeIn 0.4s ease-out forwards;}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .typing-dot{width:6px;height:6px;background-color:#9ca3af;border-radius:50%;animation:typingBounce 1.4s infinite ease-in-out both}
      .typing-dot:nth-child(1){animation-delay:-0.32s}
      .typing-dot:nth-child(2){animation-delay:-0.16s}
      .typing-dot:nth-child(3){animation-delay:0s}
      @keyframes typingBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
      .custom-loader{width:50px;height:50px;border:4px solid rgba(255,255,255,0.3);border-radius:50%;border-top-color:#ffffff;animation:spin 1s ease-in-out infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
    `}</style>
  );

  if (screen === 'loading') return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-blue-50 via-gray-100 to-blue-200 flex items-center justify-center md:p-6 font-sans">
      <GlobalStyles />
      <div className="w-full h-[100dvh] md:w-[420px] md:h-[85vh] md:min-h-[600px] md:max-h-[800px] bg-blue-700 md:rounded-[2rem] md:shadow-2xl overflow-hidden flex flex-col items-center justify-center text-white p-6 text-center md:border md:border-blue-800">
        <div className="custom-loader mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">Salvando Cadastro...</h2>
        <p className="text-blue-100">Enviando seus documentos de forma segura para a ONG.</p>
      </div>
    </div>
  );

  if (screen === 'success') return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-blue-50 via-gray-100 to-blue-200 flex items-center justify-center md:p-6 font-sans">
      <GlobalStyles />
      <div className="w-full h-[100dvh] md:w-[420px] md:h-[85vh] md:min-h-[600px] md:max-h-[800px] bg-gray-50 md:rounded-[2rem] md:shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center animate-fade-in md:border md:border-gray-200">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Realizado!</h2>
        <p className="text-gray-600 mb-8 max-w-sm">Seu pré-cadastro na {CONFIG.nomeOng} foi concluído. Lembre-se de assinar presencialmente.</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium shadow-md active:bg-blue-700 transition">
          Novo Cadastro
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-blue-50 via-gray-100 to-blue-200 flex items-center justify-center md:p-6 font-sans">
      <GlobalStyles />
      {/* O container principal do Chatbot: Funciona como uma tela de Login centralizada no PC e em ecrã inteiro no Mobile/Tablet */}
      <div className="w-full h-[100dvh] md:w-[420px] md:h-[85vh] md:min-h-[600px] md:max-h-[800px] bg-gray-50 md:rounded-[2rem] md:shadow-2xl overflow-hidden flex flex-col relative md:border md:border-gray-200">
        
        <header className="bg-blue-700 text-white p-4 shadow-md flex items-center justify-between shrink-0 z-10 relative">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-700 font-bold mr-3 shadow-sm overflow-hidden shrink-0">
              <img src={CONFIG.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{CONFIG.nomeOng}</h1>
              <p className="text-xs text-blue-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span> Online
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleBotVoice}
            className={`p-2 rounded-full transition-colors ${isVoiceBotEnabled ? 'bg-blue-600 text-white' : 'bg-blue-800 text-blue-300'}`}
            title={isVoiceBotEnabled ? "Desativar voz do bot" : "Ativar voz do bot"}
          >
            {isVoiceBotEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 relative">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
              {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-2 shrink-0 self-end mb-1 overflow-hidden"><img src={CONFIG.logoUrl} alt="Bot" className="w-full h-full object-cover opacity-80" /></div>}
              <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${msg.sender === 'bot' ? 'bg-white text-gray-800 rounded-bl-none border border-gray-100 whitespace-pre-line' : 'bg-blue-600 text-white rounded-br-none'}`}>{msg.text}</div>
            </div>
          ))}
          {isTyping && <div className="flex justify-start animate-fade-in"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-2 shrink-0 self-end mb-1 overflow-hidden"><img src={CONFIG.logoUrl} alt="Bot" className="w-full h-full object-cover opacity-80" /></div><div className="bg-white rounded-2xl rounded-bl-none py-3 px-4 shadow-sm border border-gray-100 flex items-center space-x-1 min-h-[44px]"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div></div>}
          <div ref={messagesEndRef} />
        </main>

        {currentStep < FLOW_SEQUENCE.length && !isTyping && (
          <footer className="bg-white p-3 border-t border-gray-200 shrink-0 animate-fade-in">
            <InputResolver stepData={FLOW_SEQUENCE[currentStep]} handleNextStep={handleNextStep} handleOptionSelect={handleOptionSelect} handleFileUpload={handleFileUpload} />
          </footer>
        )}
      </div>
    </div>
  );
}

function InputResolver({ stepData, handleNextStep, handleOptionSelect, handleFileUpload }) {
  const [localValues, setLocalValues] = useState({});
  const [listeningField, setListeningField] = useState(null); 

  useEffect(() => setLocalValues({}), [stepData]);

  const applyMask = (value, mask) => {
    if (!value) return '';
    if (mask === 'date') {
      let v = value.replace(/\D/g, ''); 
      // Bloqueia o dia para não passar de 31 nem ser 00
      if (v.length >= 2) {
        let dia = parseInt(v.substring(0, 2));
        if (dia > 31) v = '31' + v.substring(2);
        else if (v.length === 2 && dia === 0) v = '01' + v.substring(2);
      }
      // Bloqueia o mês para não passar de 12 nem ser 00
      if (v.length >= 4) {
        let mes = parseInt(v.substring(2, 4));
        if (mes > 12) v = v.substring(0, 2) + '12' + v.substring(4);
        else if (v.length === 4 && mes === 0) v = v.substring(0, 2) + '01' + v.substring(4);
      }
      v = v.replace(/(\d{2})(\d)/, '$1/$2');
      v = v.replace(/(\d{2})(\d)/, '$1/$2');
      return v.slice(0, 10);
    }
    if (mask === 'cpf') { let v = value.replace(/\D/g, ''); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return v.slice(0, 14); }
    if (mask === 'phone') { let v = value.replace(/\D/g, ''); v = v.replace(/^(\d{2})(\d)/g, '($1) $2'); v = v.replace(/(\d)(\d{4})$/, '$1-$2'); return v.slice(0, 15); }
    if (mask === 'rg') { return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14); }
    if (mask === 'money') { let v = value.replace(/\D/g, ''); if (!v) return ''; v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); return 'R$ ' + v; }
    return value;
  };

  const handleChange = (fieldId, value, mask) => setLocalValues(prev => ({ ...prev, [fieldId]: applyMask(value, mask) }));
  
  const toggleSpeechToText = (fieldId, currentMask) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta digitação por voz. Tente usar o Google Chrome.");
      return;
    }

    if (listeningField === fieldId) {
      setListeningField(null);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false; 
    recognition.interimResults = false;

    recognition.onstart = () => setListeningField(fieldId);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const currentValue = localValues[fieldId] || '';
      const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
      handleChange(fieldId, newValue, currentMask);
      setListeningField(null);
    };

    recognition.onerror = () => setListeningField(null);
    recognition.onend = () => setListeningField(null);

    recognition.start();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!stepData.fields.every(f => localValues[f.id] && localValues[f.id].trim() !== '')) return;
    let answerText = stepData.fields.length === 1 ? localValues[stepData.fields[0].id] : stepData.fields.map(f => `${f.label}: ${localValues[f.id]}`).join('\n');
    let valueToSave = stepData.fields.length === 1 ? localValues[stepData.fields[0].id] : localValues;
    handleNextStep(answerText, valueToSave, false);
  };

  if (stepData.type === 'options') return <div className="flex flex-col gap-2">{stepData.options.map((opt, i) => <button key={i} onClick={() => handleOptionSelect(opt)} className="w-full py-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 font-medium active:bg-blue-100 transition">{opt}</button>)}</div>;
  if (stepData.type === 'file') return <div className="flex flex-col items-center"><label className="w-full py-4 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 font-medium cursor-pointer shadow-md active:bg-blue-700 transition"><Camera size={20} />Tirar Foto / Anexar<input type="file" accept={stepData.accept} className="hidden" onChange={handleFileUpload} /></label><p className="text-xs text-gray-500 mt-2 text-center">Tire uma foto nítida em local iluminado.</p></div>;
  
  if (stepData.type === 'form') {
    const isSingleField = stepData.fields.length === 1 && stepData.fields[0].type !== 'textarea';
    const isAllFilled = stepData.fields.every(f => localValues[f.id] && localValues[f.id].trim() !== '');
    
    return (
      <form onSubmit={handleFormSubmit} className={`flex ${isSingleField ? 'flex-row items-end gap-2' : 'flex-col gap-3'} w-full`}>
        <div className={`flex flex-col gap-3 ${isSingleField ? 'flex-1' : 'w-full'}`}>
          {stepData.fields.map((field) => (
            <div key={field.id} className="flex flex-col relative">
               {field.label && !isSingleField && <span className="text-xs font-semibold text-blue-800 ml-1 mb-1">{field.label}</span>}
               
               <div className="relative flex items-center w-full">
                 {field.type === 'textarea' ? (
                    <textarea 
                      value={localValues[field.id] || ''} 
                      onChange={(e) => handleChange(field.id, e.target.value, field.mask)} 
                      placeholder={field.placeholder || field.label} 
                      className="bg-gray-100 border-none rounded-2xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none w-full" 
                      rows={2} 
                      autoFocus={stepData.fields[0].id === field.id} 
                    />
                 ) : (
                    <input 
                      type={field.type || 'text'} 
                      value={localValues[field.id] || ''} 
                      onChange={(e) => handleChange(field.id, e.target.value, field.mask)} 
                      placeholder={field.placeholder || field.label} 
                      className="bg-gray-100 border-none rounded-2xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full" 
                      autoFocus={stepData.fields[0].id === field.id} 
                    />
                 )}
                 
                 {/* Removemos a voz para a data porque números são chatos de ditar no formato certo */}
                 {field.mask !== 'date' && (
                   <button 
                     type="button" 
                     onClick={() => toggleSpeechToText(field.id, field.mask)}
                     className={`absolute right-3 p-1.5 rounded-full transition-all ${listeningField === field.id ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-blue-600 hover:bg-gray-200'}`}
                     title="Falar em vez de digitar"
                   >
                     {listeningField === field.id ? <Mic size={18} /> : <MicOff size={18} />}
                   </button>
                 )}
               </div>
            </div>
          ))}
        </div>
        <button type="submit" disabled={!isAllFilled} className={`bg-blue-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-gray-400 transition ${isSingleField ? 'w-12 h-12 rounded-full' : 'w-full py-4 rounded-xl font-bold gap-2 mt-1'}`}>
          {isSingleField ? <Send size={18} className="ml-1" /> : <><Check size={20}/> Confirmar Dados</>}
        </button>
      </form>
    );
  }
  return null;
}