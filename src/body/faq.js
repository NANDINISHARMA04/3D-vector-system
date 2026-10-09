// Built-in answers to the questions children ask most, in English and Hindi.
// Used by "Ask Body Buddy" when no AI key is configured: free and offline.
//
// Each entry: keys = words that signal the topic (English and Hindi, matched
// as word stems), en / hi = the spoken answer (2–4 short sentences + a fun fact).

export const FAQ = [
  {
    keys: ['heart', 'beat', 'faster', 'fast', 'run', 'running', 'exercise', 'pulse', 'दिल', 'धड़क', 'दौड़', 'तेज़'],
    en: 'When you run, your muscles work hard and need lots of oxygen. Your heart beats faster to pump more blood, which carries that oxygen to them. When you rest, it slows down again. Fun fact: a child’s heart beats about ninety times a minute when resting!',
    hi: 'जब आप दौड़ते हैं, तो आपकी मांसपेशियों को बहुत ऑक्सीजन चाहिए होती है। इसलिए दिल तेज़ धड़कता है ताकि ज़्यादा खून ऑक्सीजन लेकर उन तक पहुँचे। आराम करने पर यह फिर धीमा हो जाता है। मज़ेदार बात: आराम के समय बच्चे का दिल एक मिनट में लगभग नब्बे बार धड़कता है!',
  },
  {
    keys: ['hiccup', 'hiccups', 'हिचकी'],
    en: 'Hiccups happen when your diaphragm, the muscle under your lungs, suddenly jumps. Air rushes in and your vocal cords snap shut, making the "hic" sound. Eating too fast or laughing a lot can start them. They usually stop on their own after a few minutes.',
    hi: 'हिचकी तब आती है जब फेफड़ों के नीचे की मांसपेशी, डायाफ्राम, अचानक उछलती है। हवा तेज़ी से अंदर जाती है और "हिच" की आवाज़ आती है। बहुत जल्दी खाने या ज़्यादा हँसने से हिचकी शुरू हो सकती है। ये आमतौर पर कुछ मिनटों में अपने आप रुक जाती हैं।',
  },
  {
    keys: ['yawn', 'yawning', 'जम्हाई', 'उबासी'],
    en: 'Scientists think yawning helps cool your brain and wakes you up a little when you are tired or bored. Yawns are also catching: seeing someone yawn often makes you yawn too! Even babies yawn before they are born.',
    hi: 'वैज्ञानिक मानते हैं कि जम्हाई दिमाग को ठंडा करने और थकान में थोड़ा जगाने में मदद करती है। जम्हाई फैलती भी है: किसी को जम्हाई लेते देखकर अक्सर हमें भी आ जाती है! बच्चे तो जन्म से पहले भी जम्हाई लेते हैं।',
  },
  {
    keys: ['sneeze', 'sneezing', 'छींक'],
    en: 'A sneeze is your nose cleaning itself. When dust, pollen or germs tickle the inside of your nose, your body blasts air out to push them away. A sneeze can shoot out faster than a car on the highway! That is why we cover our mouth with an elbow.',
    hi: 'छींक नाक की सफ़ाई का तरीका है। जब धूल या कीटाणु नाक के अंदर गुदगुदी करते हैं, तो शरीर ज़ोर से हवा बाहर फेंककर उन्हें निकाल देता है। छींक सड़क पर चलती कार से भी तेज़ निकल सकती है! इसलिए छींकते समय कोहनी से मुँह ढकते हैं।',
  },
  {
    keys: ['blood', 'red', 'colour', 'color', 'खून', 'लाल', 'रक्त'],
    en: 'Blood is red because of haemoglobin, a protein inside red blood cells that contains iron. Haemoglobin grabs oxygen in your lungs and carries it around your body. One drop of blood holds millions of red blood cells!',
    hi: 'खून लाल होता है क्योंकि लाल रक्त कोशिकाओं में हीमोग्लोबिन होता है, जिसमें लोहा होता है। हीमोग्लोबिन फेफड़ों में ऑक्सीजन पकड़कर पूरे शरीर में पहुँचाता है। खून की एक बूँद में लाखों लाल रक्त कोशिकाएँ होती हैं!',
  },
  {
    keys: ['how many bones', 'bones', 'bone', 'हड्डी', 'हड्डियाँ', 'कितनी'],
    en: 'Grown-ups have two hundred and six bones. Babies are born with about three hundred, but some of them join together as they grow. The smallest bone is in your ear and the longest is your thigh bone.',
    hi: 'बड़ों के शरीर में दो सौ छह हड्डियाँ होती हैं। बच्चे लगभग तीन सौ हड्डियों के साथ पैदा होते हैं, पर बढ़ते-बढ़ते कुछ हड्डियाँ आपस में जुड़ जाती हैं। सबसे छोटी हड्डी कान में और सबसे लंबी जाँघ में होती है।',
  },
  {
    keys: ['water', 'drink', 'thirsty', 'पानी', 'प्यास'],
    en: 'More than half of your body is water! Water carries food to your cells, keeps you cool through sweat and helps wash away waste. When you are thirsty, your brain is telling you it is time for a drink.',
    hi: 'आपके शरीर का आधे से ज़्यादा हिस्सा पानी है! पानी कोशिकाओं तक भोजन पहुँचाता है, पसीने से शरीर को ठंडा रखता है और कचरा बाहर निकालने में मदद करता है। प्यास लगना मस्तिष्क का संदेश है कि पानी पीने का समय है।',
  },
  {
    keys: ['stomach', 'growl', 'rumble', 'noise', 'hungry', 'पेट', 'गुड़गुड़', 'भूख'],
    en: 'Your stomach growls when its muscles squeeze and push air and juices around, especially when it is empty. It is like your tummy saying "I’m ready for food!" The sound has a funny scientific name: borborygmi.',
    hi: 'पेट की मांसपेशियाँ जब सिकुड़कर हवा और रस को इधर-उधर धकेलती हैं, खासकर खाली पेट होने पर, तब पेट गुड़गुड़ करता है। यह पेट का कहना है, "मैं खाने के लिए तैयार हूँ!"',
  },
  {
    keys: ['sleep', 'tired', 'why sleep', 'नींद', 'सोना', 'सोते'],
    en: 'Sleep is when your body and brain recharge. Your brain sorts out what you learned during the day, and your body grows and repairs itself. Children need about nine to eleven hours of sleep every night.',
    hi: 'नींद में शरीर और मस्तिष्क फिर से ऊर्जा भरते हैं। मस्तिष्क दिन में सीखी बातें सहेजता है और शरीर बढ़ता और अपनी मरम्मत करता है। बच्चों को हर रात लगभग नौ से ग्यारह घंटे सोना चाहिए।',
  },
  {
    keys: ['dream', 'dreams', 'सपना', 'सपने'],
    en: 'Dreams happen mostly during a stage of sleep called REM, when your brain is very busy. Scientists think dreaming helps your brain store memories and practise feelings. Everyone dreams every night, even if they do not remember it.',
    hi: 'सपने ज़्यादातर नींद के उस हिस्से में आते हैं जब मस्तिष्क बहुत सक्रिय होता है। वैज्ञानिक मानते हैं कि सपने यादें सहेजने में मदद करते हैं। हर कोई हर रात सपने देखता है, भले ही उसे याद न रहे।',
  },
  {
    keys: ['blink', 'blinking', 'पलक', 'झपक'],
    en: 'Blinking spreads tears across your eyes to keep them wet and clean. It also protects them from dust. You blink about fifteen times every minute without even thinking about it!',
    hi: 'पलक झपकने से आँसू आँखों पर फैलते हैं और आँखें गीली और साफ़ रहती हैं। यह धूल से भी बचाता है। हम बिना सोचे हर मिनट लगभग पंद्रह बार पलक झपकाते हैं!',
  },
  {
    keys: ['cry', 'crying', 'tears', 'tear', 'रोना', 'आँसू'],
    en: 'Tears keep your eyes wet and wash away dust. When you feel very sad or very happy, your brain can make extra tears too. Crying is a normal way your body shows big feelings, and talking to someone you trust helps.',
    hi: 'आँसू आँखों को गीला रखते हैं और धूल धो देते हैं। बहुत दुखी या बहुत खुश होने पर मस्तिष्क ज़्यादा आँसू बना सकता है। रोना बड़ी भावनाएँ दिखाने का एक सामान्य तरीका है, और किसी भरोसेमंद व्यक्ति से बात करने से मदद मिलती है।',
  },
  {
    keys: ['sweat', 'sweating', 'hot', 'पसीना', 'गर्मी'],
    en: 'Sweat is your body’s air conditioner. When you get hot, tiny glands in your skin release salty water. As it dries, it carries heat away and cools you down. You have millions of sweat glands!',
    hi: 'पसीना शरीर का एयर कंडीशनर है। गर्मी लगने पर त्वचा की छोटी ग्रंथियाँ नमकीन पानी छोड़ती हैं। जब यह सूखता है तो गर्मी साथ ले जाता है और शरीर ठंडा होता है। हमारे शरीर में लाखों पसीने की ग्रंथियाँ हैं!',
  },
  {
    keys: ['goosebumps', 'goose', 'shiver', 'cold', 'रोंगटे', 'ठंड', 'काँप'],
    en: 'When you are cold, tiny muscles pull your hairs up, making goosebumps. Shivering makes your muscles shake quickly, which creates heat to warm you up. Your body works hard to stay at the right temperature.',
    hi: 'ठंड लगने पर छोटी मांसपेशियाँ बालों को खड़ा कर देती हैं, जिससे रोंगटे खड़े होते हैं। काँपने से मांसपेशियाँ तेज़ी से हिलती हैं और गर्मी पैदा करती हैं। शरीर सही तापमान बनाए रखने के लिए बहुत मेहनत करता है।',
  },
  {
    keys: ['burp', 'burping', 'डकार'],
    en: 'A burp is extra air leaving your stomach. You swallow air when you eat, drink or talk, and fizzy drinks add even more gas. Your stomach lets it out through your mouth.',
    hi: 'डकार पेट से निकलने वाली अतिरिक्त हवा है। खाते, पीते या बोलते समय हम हवा निगल लेते हैं, और सोडा वाले पेय और गैस बनाते हैं। पेट उसे मुँह से बाहर निकाल देता है।',
  },
  {
    keys: ['food', 'digest', 'digestion', 'eat', 'where does food go', 'खाना', 'भोजन', 'पचता', 'पाचन'],
    en: 'Food starts its journey in your mouth, slides down the food pipe into your stomach, then travels through your small intestine, where nutrients soak into your blood. The large intestine takes back water, and what is left leaves your body. The whole trip takes one to two days!',
    hi: 'खाना मुँह से शुरू होकर ग्रासनली से पेट में जाता है, फिर छोटी आँत में, जहाँ पोषक तत्व खून में सोख लिए जाते हैं। बड़ी आँत पानी वापस लेती है और बचा हुआ शरीर से बाहर निकल जाता है। पूरी यात्रा में एक से दो दिन लगते हैं!',
  },
  {
    keys: ['breathe', 'breathing', 'breath', 'oxygen', 'air', 'साँस', 'ऑक्सीजन', 'हवा'],
    en: 'Every cell in your body needs oxygen to make energy. When you breathe in, your lungs take oxygen from the air into your blood. When you breathe out, you get rid of carbon dioxide, a waste gas. You breathe about twenty thousand times a day!',
    hi: 'शरीर की हर कोशिका को ऊर्जा बनाने के लिए ऑक्सीजन चाहिए। साँस लेने पर फेफड़े हवा से ऑक्सीजन खून में डालते हैं, और साँस छोड़ने पर कार्बन डाइऑक्साइड बाहर निकलती है। हम दिन में लगभग बीस हज़ार बार साँस लेते हैं!',
  },
  {
    keys: ['brain', 'think', 'remember', 'memory', 'smart', 'मस्तिष्क', 'दिमाग', 'याद', 'सोच'],
    en: 'Your brain has about eighty-six billion nerve cells that send tiny electrical messages to each other. When you learn something, new connections form between them, and practising makes those connections stronger. That is why practice helps you remember!',
    hi: 'मस्तिष्क में लगभग छियासी अरब तंत्रिका कोशिकाएँ हैं जो एक-दूसरे को छोटे बिजली के संदेश भेजती हैं। कुछ नया सीखने पर उनके बीच नए जुड़ाव बनते हैं, और अभ्यास से वे मज़बूत होते हैं। इसीलिए अभ्यास से याद रहता है!',
  },
  {
    keys: ['see', 'eyes', 'eye', 'colours', 'colors', 'vision', 'आँख', 'देख', 'रंग'],
    en: 'Light bounces off things and enters your eye through the pupil. The lens focuses it onto the retina at the back, where special cells sense light and colour. The optic nerve sends the picture to your brain, which works out what you are seeing.',
    hi: 'रोशनी चीज़ों से टकराकर पुतली से आँख में आती है। लेंस उसे पीछे रेटिना पर फ़ोकस करता है, जहाँ खास कोशिकाएँ रोशनी और रंग पहचानती हैं। दृष्टि तंत्रिका तस्वीर मस्तिष्क तक भेजती है, जो समझता है कि हम क्या देख रहे हैं।',
  },
  {
    keys: ['hear', 'hearing', 'sound', 'ears', 'ear', 'pop', 'सुन', 'आवाज़', 'कान'],
    en: 'Sound waves travel into your ear and make the eardrum wobble. Three tiny bones pass the wobble to the snail-shaped cochlea, which turns it into nerve signals for your brain. Your ears "pop" on a plane when a tube balances the air pressure.',
    hi: 'आवाज़ की तरंगें कान में जाकर कान के पर्दे को कंपाती हैं। तीन छोटी हड्डियाँ यह कंपन घोंघे जैसे कॉक्लिया तक पहुँचाती हैं, जो इसे मस्तिष्क के लिए संकेतों में बदलता है। हवाई जहाज़ में कान "पॉप" करते हैं जब एक नली हवा का दबाव बराबर करती है।',
  },
  {
    keys: ['dizzy', 'spin', 'spinning', 'balance', 'चक्कर', 'संतुलन'],
    en: 'Inside your ears are three loops full of liquid that help you balance. When you spin, the liquid keeps swirling even after you stop, so your brain thinks you are still moving. That is why you feel dizzy!',
    hi: 'कान के अंदर तरल से भरी तीन नलिकाएँ संतुलन में मदद करती हैं। घूमने के बाद रुकने पर भी तरल घूमता रहता है, इसलिए मस्तिष्क को लगता है कि हम अभी भी घूम रहे हैं। इसीलिए चक्कर आता है!',
  },
  {
    keys: ['teeth', 'tooth', 'baby teeth', 'fall', 'brush', 'दाँत', 'ब्रश'],
    en: 'Children have twenty baby teeth that fall out to make room for bigger adult teeth. Brushing twice a day removes germs that make acid and cause holes, called cavities. Enamel, the shiny outer layer, is the hardest thing in your body!',
    hi: 'बच्चों के बीस दूध के दाँत होते हैं जो बड़े पक्के दाँतों के लिए जगह बनाने गिर जाते हैं। दिन में दो बार ब्रश करने से वे कीटाणु हटते हैं जो दाँतों में छेद करते हैं। इनेमल, चमकदार बाहरी परत, शरीर की सबसे कठोर चीज़ है!',
  },
  {
    keys: ['hair', 'nails', 'nail', 'cut', 'hurt', 'बाल', 'नाखून'],
    en: 'Hair and nails are made of keratin, the same material as animal horns and feathers. The parts you can see are not alive and have no nerves, so cutting them does not hurt. They keep growing from living roots under your skin.',
    hi: 'बाल और नाखून केराटिन से बने होते हैं, वही पदार्थ जो जानवरों के सींग और पंखों में होता है। दिखने वाला हिस्सा जीवित नहीं है और उसमें नसें नहीं हैं, इसलिए काटने पर दर्द नहीं होता। ये त्वचा के नीचे जीवित जड़ों से बढ़ते रहते हैं।',
  },
  {
    keys: ['bruise', 'scab', 'cut', 'wound', 'heal', 'healing', 'चोट', 'घाव', 'खरोंच'],
    en: 'When you get a cut, tiny blood cells called platelets rush in to plug the hole, and a scab forms like a natural bandage. Underneath, new skin grows. A bruise is blood under the skin, and it changes colour as your body cleans it up. Always tell a grown-up about a cut.',
    hi: 'कटने पर प्लेटलेट्स नाम की छोटी कोशिकाएँ छेद भरने आती हैं और पपड़ी एक प्राकृतिक पट्टी की तरह बनती है। उसके नीचे नई त्वचा बनती है। नील पड़ना त्वचा के नीचे खून है, जो ठीक होते समय रंग बदलता है। चोट लगने पर हमेशा किसी बड़े को बताएँ।',
  },
  {
    keys: ['fever', 'sick', 'germs', 'ill', 'बुखार', 'बीमार', 'कीटाणु'],
    en: 'When germs get in, your body raises its temperature to make it harder for them to grow. That is a fever. White blood cells are your body’s defenders that fight the germs. If you feel unwell, tell a parent, teacher or doctor so they can help.',
    hi: 'जब कीटाणु शरीर में आते हैं, तो शरीर उनका बढ़ना मुश्किल करने के लिए तापमान बढ़ाता है, इसे बुखार कहते हैं। सफ़ेद रक्त कोशिकाएँ शरीर की रक्षक हैं जो कीटाणुओं से लड़ती हैं। तबीयत ठीक न लगे तो माता-पिता, शिक्षक या डॉक्टर को बताएँ।',
  },
  {
    keys: ['vegetables', 'healthy', 'fruit', 'eat', 'grow', 'strong', 'सब्ज़ी', 'फल', 'स्वस्थ', 'मज़बूत'],
    en: 'Vegetables and fruit are full of vitamins, minerals and fibre that help you grow, fight germs and keep your digestion moving. Eating lots of colours gives your body lots of different helpers. Water, sleep and play keep you strong too!',
    hi: 'सब्ज़ियों और फलों में विटामिन, खनिज और रेशा होता है जो बढ़ने, कीटाणुओं से लड़ने और पाचन में मदद करते हैं। अलग-अलग रंगों का खाना शरीर को कई तरह के मददगार देता है। पानी, नींद और खेल भी हमें मज़बूत रखते हैं!',
  },
  {
    keys: ['muscle', 'muscles', 'move', 'cramp', 'मांसपेशी', 'हिल'],
    en: 'You have more than six hundred muscles. They work by pulling on your bones, like ropes on a puppet. Muscles often work in pairs: one pulls to bend your arm and the other pulls to straighten it. Your heart is a muscle that never gets tired!',
    hi: 'हमारे शरीर में छह सौ से ज़्यादा मांसपेशियाँ हैं। ये हड्डियों को खींचकर काम करती हैं, जैसे कठपुतली की डोरियाँ। मांसपेशियाँ अक्सर जोड़ी में काम करती हैं: एक हाथ मोड़ती है और दूसरी सीधा करती है। दिल एक ऐसी मांसपेशी है जो कभी नहीं थकती!',
  },
  {
    keys: ['nerves', 'nerve', 'touch', 'feel', 'pain', 'नस', 'छू', 'दर्द', 'महसूस'],
    en: 'Nerves are like wires that carry messages between your body and brain. When you touch something hot, a message zooms up your arm and your hand pulls away in a split second. Some messages travel faster than a racing car!',
    hi: 'नसें तारों की तरह हैं जो शरीर और मस्तिष्क के बीच संदेश ले जाती हैं। किसी गर्म चीज़ को छूने पर संदेश तेज़ी से जाता है और हाथ पल भर में हट जाता है। कुछ संदेश रेसिंग कार से भी तेज़ चलते हैं!',
  },
  {
    keys: ['skin', 'wrinkly', 'wrinkle', 'bath', 'त्वचा', 'झुर्री'],
    en: 'Your skin is your biggest organ. It keeps germs out, holds water in and lets you feel touch. Fingers go wrinkly in the bath because your nerves tell the skin to shrink a little, which may help you grip wet things!',
    hi: 'त्वचा हमारा सबसे बड़ा अंग है। यह कीटाणुओं को बाहर और पानी को अंदर रखती है और छूने का एहसास कराती है। नहाते समय उँगलियाँ सिकुड़ जाती हैं क्योंकि नसें त्वचा को थोड़ा सिकोड़ती हैं, जिससे गीली चीज़ें पकड़ने में मदद मिल सकती है!',
  },
  {
    keys: ['kidney', 'kidneys', 'pee', 'urine', 'wee', 'toilet', 'गुर्दे', 'किडनी', 'पेशाब'],
    en: 'Your two kidneys are filters for your blood. They take out waste and extra water and turn them into urine, which is stored in the bladder until you go to the toilet. Drinking enough water helps your kidneys do their job.',
    hi: 'आपके दोनों गुर्दे खून के फ़िल्टर हैं। ये कचरा और ज़्यादा पानी निकालकर पेशाब बनाते हैं, जो शौचालय जाने तक मूत्राशय में जमा रहता है। पर्याप्त पानी पीने से गुर्दे अच्छे से काम करते हैं।',
  },
  {
    keys: ['grow', 'growing', 'taller', 'height', 'बढ़', 'लंबा'],
    en: 'You grow because your bones get longer, mostly while you sleep! Special growth areas near the ends of your bones add new bone. Good food, sleep and exercise give your body what it needs to grow.',
    hi: 'हम इसलिए बढ़ते हैं क्योंकि हड्डियाँ लंबी होती हैं, और ज़्यादातर यह सोते समय होता है! हड्डियों के सिरों के पास खास हिस्से नई हड्डी बनाते हैं। अच्छा खाना, नींद और व्यायाम शरीर को बढ़ने के लिए ज़रूरी चीज़ें देते हैं।',
  },
];

const norm = (s) => s.toLowerCase().normalize('NFC').replace(/[?!.,'’"।]/g, ' ');

/** Best built-in answer for a question: { text, score } (score = matched keywords), or null. */
export function findAnswer(question, lang = 'en') {
  const q = ` ${norm(question)} `;
  let best = null;
  let bestScore = 0;
  for (const entry of FAQ) {
    let score = 0;
    for (const key of entry.keys) {
      const k = norm(key).trim();
      if (!k) continue;
      // Multi-word keys and Hindi stems match as substrings; short English words as whole words.
      const hit = /[^\x00-\x7F]/.test(k) || k.includes(' ') ? q.includes(k) : new RegExp(`\\b${k}`).test(q);
      if (hit) score += k.includes(' ') ? 3 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (!best) return null;
  return { text: lang === 'hi' ? best.hi : best.en, score: bestScore };
}
