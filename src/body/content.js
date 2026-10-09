// Kid-friendly narration for Body Explorer.
// Each model: intro + parts { [part name]: [summary, fun fact] }.
// Part names must match the model definitions in src/models/anatomy.js.

export const LESSONS = {
  'human-body': {
    intro: 'This is the human body. It is made of about 37 trillion tiny cells, all working together as a team!',
    parts: {
      Brain: ['Your brain is the boss of your body. It thinks, remembers and tells every part what to do.', 'Your brain uses about as much power as a small light bulb.'],
      Lungs: ['Your two lungs fill with air when you breathe in, and give your blood fresh oxygen.', 'If you spread out your lungs flat, they would cover a tennis court!'],
      Heart: ['Your heart is a strong muscle that pumps blood all around your body.', 'Your heart beats about one hundred thousand times every day.'],
      Liver: ['Your liver cleans your blood and helps you digest food.', 'Your liver can grow back if part of it is removed!'],
      Stomach: ['Your stomach mixes food with special juices and turns it into a mushy soup.', 'Your stomach gets a brand new lining every few days.'],
      Intestines: ['Your intestines are long tubes that soak up the good stuff from your food.', 'Your small intestine is longer than a giraffe is tall.'],
      Kidneys: ['Your two kidneys clean your blood and make wee.', 'Your kidneys clean all of your blood about forty times a day.'],
      Bladder: ['Your bladder is a stretchy bag that holds wee until you go to the toilet.', 'Your bladder can stretch like a balloon as it fills up.'],
      'Nervous system': ['Your nerves carry messages between your brain and your body, super fast.', 'Some nerve messages travel faster than a racing car!'],
      Arteries: ['Arteries are tubes that carry red, oxygen-rich blood away from your heart.', 'Your biggest artery, the aorta, is about as wide as a garden hose.'],
      Veins: ['Veins carry blood back to your heart so it can be pumped again.', 'Veins look blue through your skin, but the blood inside is actually dark red.'],
      Skeleton: ['Your skeleton is the frame that holds you up and protects your organs.', 'Babies have about three hundred bones, but grown-ups have two hundred and six.'],
      Skin: ['Your skin is your body\'s waterproof coat. It protects you and helps you feel things.', 'Skin is your biggest organ, and you shed thousands of skin flakes every minute!'],
    },
  },
  skeleton: {
    intro: 'This is the skeleton. Two hundred and six bones hold you up and help you move.',
    parts: {
      Skull: ['Your skull is a hard helmet made of bones that protects your brain.', 'The only skull bone that moves is your jaw.'],
      Spine: ['Your spine is a stack of small bones called vertebrae that lets you bend and twist.', 'You are a little bit taller in the morning than at night!'],
      'Rib cage': ['Your ribs make a cage that protects your heart and lungs.', 'Most people have twelve pairs of ribs.'],
      Pelvis: ['Your pelvis is a bowl of bones that connects your spine to your legs.', 'Your pelvis carries the weight of your whole upper body.'],
      Arms: ['Your arm bones work like levers so you can lift, throw and hug.', 'Your funny bone is not a bone at all, it is a nerve!'],
      Hands: ['Each hand has twenty-seven bones, so you can draw, write and grab.', 'More than half of all your bones are in your hands and feet.'],
      Legs: ['Your leg bones are strong pillars for walking, running and jumping.', 'Your thigh bone, the femur, is the longest and strongest bone in your body.'],
      Feet: ['Your feet have arches like little bridges to carry your weight.', 'Each foot has twenty-six bones.'],
    },
  },
  brain: {
    intro: 'This is the brain. It has about eighty-six billion nerve cells that send messages to each other.',
    parts: {
      'Frontal lobe': ['The frontal lobe helps you plan, solve problems and make choices.', 'It is the last part of your brain to finish growing, in your twenties!'],
      'Parietal lobe': ['The parietal lobe helps you feel touch, heat and where your body is.', 'It helps you know where your hand is, even with your eyes closed.'],
      'Temporal lobe': ['The temporal lobes help you hear, understand words and remember things.', 'It helps you recognise the voices of people you love.'],
      'Occipital lobe': ['The occipital lobe, at the back, turns signals from your eyes into pictures.', 'You see with the back of your brain, not just your eyes!'],
      Cerebellum: ['The cerebellum helps you balance and move smoothly.', 'It holds more than half of all the nerve cells in your brain.'],
      'Brain stem': ['The brain stem keeps you breathing and your heart beating, even when you sleep.', 'It works all the time without you ever thinking about it.'],
      'Corpus callosum': ['The corpus callosum is a bridge that lets the two halves of your brain talk.', 'It has about two hundred million message wires.'],
    },
  },
  heart: {
    intro: 'This is the heart. It is a muscle about the size of your fist, and it never takes a break.',
    parts: {
      'Left ventricle': ['The left ventricle is the strongest chamber. It pumps blood to your whole body.', 'Its wall is thicker than the other chambers because it works the hardest.'],
      'Right ventricle': ['The right ventricle pumps blood to your lungs to pick up oxygen.', 'It only has to push blood a short way, to your lungs.'],
      'Left atrium': ['The left atrium collects fresh blood coming back from your lungs.', 'Atrium means entrance hall, like the front room of a house.'],
      'Right atrium': ['The right atrium collects used blood coming back from your body.', 'Your heartbeat starts here, with a tiny electric spark.'],
      Aorta: ['The aorta is the biggest artery. It carries blood out of the heart.', 'Blood rushes through your aorta faster than you can walk.'],
      'Pulmonary artery': ['The pulmonary artery carries blood from the heart to the lungs.', 'It is the only artery that carries blood low in oxygen.'],
      'Vena cava': ['The vena cava are the big veins that bring blood back to the heart.', 'They are the largest veins in your body.'],
      'Pulmonary veins': ['The pulmonary veins bring fresh, oxygen-rich blood from the lungs.', 'There are usually four of them.'],
      'Coronary arteries': ['The coronary arteries feed the heart muscle itself with blood.', 'Even your heart needs its own food and oxygen!'],
    },
  },
  lungs: {
    intro: 'These are your lungs. You take about twenty thousand breaths every day.',
    parts: {
      Trachea: ['The trachea, or windpipe, carries air down to your lungs.', 'It is held open by rings of bendy cartilage, like a vacuum hose.'],
      Bronchi: ['The bronchi split the air into two paths, one for each lung.', 'They look like an upside-down tree trunk.'],
      'Bronchial tree': ['The airways branch again and again into tiny tubes ending in air sacs.', 'You have about four hundred and eighty million tiny air sacs!'],
      'Right lung': ['The right lung has three sections, called lobes.', 'Your right lung is a little bigger than your left.'],
      'Left lung': ['The left lung has two lobes and a small space for your heart.', 'That space is called the cardiac notch.'],
      Heart: ['Your heart sits snugly between your lungs.', 'Your lungs and heart work as a team to move oxygen around.'],
      Diaphragm: ['The diaphragm is a dome-shaped muscle that pulls air into your lungs.', 'Hiccups happen when your diaphragm suddenly jumps!'],
    },
  },
  kidney: {
    intro: 'This is a kidney. You have two of them, each about the size of a computer mouse.',
    parts: {
      Cortex: ['The cortex is the outer layer, where blood starts to be cleaned.', 'It holds about a million tiny filters called nephrons.'],
      Medulla: ['The medulla has cone shapes that collect the cleaned-out water and waste.', 'The cones are called renal pyramids.'],
      'Renal pelvis': ['The renal pelvis is a funnel that gathers the wee.', 'It works like a funnel pouring into a bottle.'],
      Ureter: ['The ureter is a thin tube that carries wee down to the bladder.', 'Its muscles squeeze to push the wee along, even upside down.'],
      'Renal artery': ['The renal artery brings blood into the kidney to be cleaned.', 'A big share of the blood from every heartbeat goes to your kidneys.'],
      'Renal vein': ['The renal vein carries clean blood back towards the heart.', 'Blood leaving the kidney is some of the cleanest in your body.'],
      'Adrenal gland': ['The adrenal gland sits on top and makes adrenaline.', 'Adrenaline gives you a burst of energy when you get a fright.'],
    },
  },
  eye: {
    intro: 'This is the eye. It works like a living camera that sends pictures to your brain.',
    parts: {
      Sclera: ['The sclera is the tough white part that protects your eye.', 'It is the white of your eye.'],
      Cornea: ['The cornea is a clear dome at the front that helps focus light.', 'The cornea has no blood vessels. It gets oxygen straight from the air!'],
      Iris: ['The iris is the coloured part. It makes the pupil bigger or smaller.', 'Your iris pattern is unique, just like a fingerprint.'],
      Lens: ['The lens changes shape to focus on things near and far.', 'The picture on the back of your eye is upside down. Your brain flips it!'],
      'Vitreous humour': ['The vitreous humour is clear jelly that keeps your eye round.', 'It makes up most of your eyeball.'],
      Retina: ['The retina is the screen at the back that senses light and colour.', 'It has about one hundred and thirty million light sensors.'],
      'Optic nerve': ['The optic nerve carries pictures from your eye to your brain.', 'Where it joins the eye, you have a tiny blind spot.'],
      'Eye muscles': ['Six small muscles move your eye up, down and side to side.', 'Your eye muscles are some of the busiest muscles in your body.'],
    },
  },
  ear: {
    intro: 'This is the ear. It helps you hear and also helps you keep your balance.',
    parts: {
      'Outer ear': ['The outer ear catches sound waves like a satellite dish.', 'Your ears keep growing slowly your whole life.'],
      'Ear canal': ['The ear canal is a tunnel that carries sound inside.', 'Ear wax helps keep the canal clean and safe.'],
      Eardrum: ['The eardrum is a thin skin that wobbles when sound hits it.', 'It is about as thick as a sheet of paper.'],
      Ossicles: ['The ossicles are three tiny bones that make sounds louder.', 'The stirrup is the smallest bone in your whole body, smaller than a grain of rice.'],
      'Semicircular canals': ['These three loops are full of liquid and help you balance.', 'They are why you feel dizzy after spinning around.'],
      Cochlea: ['The cochlea is shaped like a snail and turns sound into nerve signals.', 'It is about the size of a pea.'],
      'Auditory nerve': ['The auditory nerve carries sound messages to your brain.', 'Your brain can tell which direction a sound came from.'],
      'Eustachian tube': ['This tube connects your ear to your throat and balances air pressure.', 'It is what pops when you yawn on an aeroplane!'],
    },
  },
  tooth: {
    intro: 'This is a molar tooth. Molars are big back teeth for grinding food.',
    parts: {
      Enamel: ['Enamel is the shiny white coat on the outside of your tooth.', 'Enamel is the hardest thing in your whole body.'],
      Dentin: ['Dentin is the yellowish layer under the enamel.', 'Dentin has tiny tubes that can feel hot and cold.'],
      Pulp: ['The pulp is the soft middle with nerves and blood vessels.', 'The pulp is what hurts when you have toothache.'],
      Roots: ['Roots anchor your tooth into your jawbone, like a tree in the ground.', 'Molars can have two or three roots.'],
      Gum: ['Your gums are soft pink skin that hug your teeth.', 'Brushing gently along your gums keeps them healthy.'],
      Jawbone: ['The jawbone holds all your teeth in place.', 'Your jaw muscle is one of the strongest muscles in your body.'],
    },
  },
  skull: {
    intro: 'This is the skull. It protects your brain and gives your face its shape.',
    parts: {
      Cranium: ['The cranium is the dome that wraps around your brain.', 'It is made of eight bones that join together as you grow.'],
      'Eye sockets': ['The eye sockets are bony circles that protect your eyes.', 'They are called orbits, like planets going around!'],
      'Nasal cavity': ['The nasal cavity is the space behind your nose where air comes in.', 'It warms the air and catches dust before it reaches your lungs.'],
      Cheekbones: ['Your cheekbones give your face its shape.', 'Their real name is the zygomatic bones.'],
      Maxilla: ['The maxilla is your upper jaw. It holds your top teeth.', 'It also forms part of the floor of your eye sockets.'],
      'Upper teeth': ['Your upper teeth bite and chew your food.', 'Grown-ups have up to thirty-two teeth.'],
      'Lower teeth': ['Your lower teeth move up and down with your jaw.', 'Children have twenty baby teeth.'],
      Mandible: ['The mandible is your lower jaw, the only skull bone that moves.', 'It is the strongest bone in your face.'],
    },
  },
  circulatory: {
    intro: 'This is the circulatory system. Your heart and blood vessels carry oxygen and food to every cell.',
    parts: {
      Heart: ['The heart pumps blood all around your body without stopping.', 'It pumps enough blood each day to fill a small swimming pool.'],
      Arteries: ['Arteries carry oxygen-rich blood away from the heart.', 'You can feel arteries pumping when you check your pulse.'],
      Veins: ['Veins bring blood back to the heart to be pumped again.', 'Veins have tiny doors called valves so blood cannot flow backwards.'],
      Lungs: ['Blood passes through the lungs to swap old air for fresh oxygen.', 'This swap happens every single time you breathe.'],
      Capillaries: ['Capillaries are tiny tubes that reach every cell in your body.', 'Laid end to end, your blood vessels would wrap around the Earth more than twice!'],
    },
  },
  digestive: {
    intro: 'This is the digestive system. It turns your food into energy, on a journey about nine metres long!',
    parts: {
      Mouth: ['Digestion starts in your mouth, where your teeth chew food into small pieces.', 'You make about a litre of spit every day!'],
      'Salivary glands': ['Salivary glands make spit, which softens food and starts breaking it down.', 'Just smelling food can make your mouth water.'],
      Oesophagus: ['The oesophagus is a tube that squeezes food down to your stomach.', 'It can push food down even if you are upside down!'],
      Stomach: ['The stomach churns food with strong acid until it becomes a thick soup.', 'A grown-up stomach can stretch to hold about one and a half litres.'],
      Liver: ['The liver makes bile to break down fat, and cleans your blood.', 'Your liver does more than five hundred different jobs.'],
      Gallbladder: ['The gallbladder stores bile and squirts it out when you eat fatty food.', 'It is about the size of a small pear.'],
      Pancreas: ['The pancreas makes juices that break down food and controls your sugar levels.', 'It makes a hormone called insulin.'],
      'Small intestine': ['The small intestine soaks up the nutrients from your food into your blood.', 'It is covered in tiny fingers called villi that soak up food.'],
      'Large intestine': ['The large intestine takes water back and gets waste ready to leave.', 'Trillions of friendly bacteria live in your large intestine.'],
      Body: ['All of these organs fit neatly inside your tummy.', 'Food takes about one or two days to travel all the way through.'],
    },
  },
  nervous: {
    intro: 'This is the nervous system. It is your body\'s super-fast message network.',
    parts: {
      Brain: ['The brain is the control centre that makes sense of every message.', 'Your brain is about seventy-five percent water.'],
      Cerebellum: ['The cerebellum helps you balance, ride a bike and catch a ball.', 'Cerebellum means little brain.'],
      'Spinal cord': ['The spinal cord carries messages up and down between your brain and body.', 'It is about as thick as your finger.'],
      'Arm nerves': ['Arm nerves carry feelings of touch from your fingertips.', 'Your fingertips have more touch sensors than almost anywhere else.'],
      'Leg nerves': ['Leg nerves tell your leg muscles when to walk, run and jump.', 'The sciatic nerve in your leg is the longest nerve in your body.'],
      'Rib nerves': ['Rib nerves help the muscles between your ribs move when you breathe.', 'They wrap around your chest like stripes.'],
      Body: ['Nerves reach every part of your body, from head to toe.', 'If you joined up all your nerves, they would stretch for over seventy kilometres.'],
    },
  },
};

// Sidebar structure for teachers.
export const SECTIONS = [
  { title: 'Whole Body', items: [{ id: 'human-body', icon: '🧍', tint: '#ff9f0a' }] },
  {
    title: 'Body Systems',
    items: [
      { id: 'skeleton', label: 'Skeletal System', icon: '🦴', tint: '#8e8e93' },
      { id: 'circulatory', icon: '🩸', tint: '#ff375f' },
      { id: 'lungs', label: 'Respiratory System', icon: '🫁', tint: '#64d2ff' },
      { id: 'digestive', icon: '🍎', tint: '#ff9f0a' },
      { id: 'nervous', icon: '⚡️', tint: '#ffd60a' },
      { id: 'kidney', label: 'Urinary System', icon: '💧', tint: '#0a84ff' },
    ],
  },
  {
    title: 'Organs',
    items: [
      { id: 'brain', icon: '🧠', tint: '#bf5af2' },
      { id: 'heart', icon: '❤️', tint: '#ff453a' },
      { id: 'eye', icon: '👁️', tint: '#30d158' },
      { id: 'ear', icon: '👂', tint: '#ff9f0a' },
      { id: 'tooth', icon: '🦷', tint: '#5e5ce6' },
      { id: 'skull', icon: '💀', tint: '#636366' },
    ],
  },
];

export function narration(modelId, partName) {
  const entry = LESSONS[modelId]?.parts[partName];
  if (!entry) return null;
  return { summary: entry[0], fact: entry[1] };
}
