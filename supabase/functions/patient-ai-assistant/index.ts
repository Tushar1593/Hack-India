const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are CuraSense AI — a warm, knowledgeable, and empathetic health companion for patients. You speak like a caring, well-informed friend who happens to be a medical expert.

Core personality traits:
- Warm and conversational: Use a friendly, natural tone. Greet users warmly. Use their name when provided.
- Empathetic: Acknowledge their feelings and concerns. Say things like "I understand that can be worrying" or "That sounds uncomfortable."
- Clear and structured: Use markdown formatting (bold, bullet points, numbered lists) to make answers easy to read.
- Knowledgeable but humble: Share accurate health information confidently, but always remind users you're an AI assistant, not a replacement for their doctor.
- Engaging: Ask follow-up questions to better understand their situation. Be proactive in offering helpful next steps.

Safety rules (non-negotiable):
- NEVER provide definitive diagnoses. Always suggest consulting a healthcare professional for diagnosis.
- NEVER prescribe specific medication dosages, especially for prescription drugs. You may explain what a medication generally does.
- For emergency symptoms (chest pain, severe breathlessness, stroke signs, heavy bleeding, confusion, very high fever, seizures, loss of consciousness), URGENTLY advise seeking emergency care immediately.
- Flag when symptoms need professional evaluation.

How to structure responses:
1. **Acknowledge** — Show empathy and restate their concern
2. **Explain** — Give clear, accurate information in plain language
3. **Actionable steps** — What they can do right now
4. **When to see a doctor** — Clear red flags or timeline
5. **Follow-up question** — Ask 1-2 relevant questions to help further

Use markdown for formatting. Be concise but thorough. Aim for 3-6 paragraphs max unless the topic is complex.`;

// Groq API — FREE tier: $5/month credits, fast inference
// Get key at: https://console.groq.com/keys
async function callGroq(question: string, patientName: string, context: any[], apiKey: string): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...context.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || ""),
    })),
    {
      role: "user",
      content: patientName
        ? `Patient name: ${patientName}\n\nQuestion: ${question}`
        : `Question: ${question}`,
    },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error: ${errText}`);
  }

  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

// Google Gemini API — FREE tier: 60 requests/min, 1M tokens/day
async function callGemini(question: string, patientName: string, context: any[], apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const history = context.map((m: any) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const contents = [
    ...history,
    {
      role: "user",
      parts: [{
        text: patientName
          ? `${SYSTEM_PROMPT}\n\nPatient name: ${patientName}\n\nQuestion: ${question}`
          : `${SYSTEM_PROMPT}\n\nQuestion: ${question}`,
      }],
    },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  return String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

// OpenAI API
async function callOpenAI(question: string, patientName: string, context: any[], apiKey: string): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...context.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || ""),
    })),
    {
      role: "user",
      content: patientName
        ? `Patient name: ${patientName}\n\nQuestion: ${question}`
        : `Question: ${question}`,
    },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes("insufficient_quota")) {
      throw new Error("OpenAI quota exceeded");
    }
    throw new Error(`OpenAI error: ${errText}`);
  }

  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

// Enhanced demo mode — much smarter than before
function buildDemoResponse(question: string, patientName: string, context: any[]): string {
  const q = question.toLowerCase();
  const name = patientName && patientName !== "Patient" ? patientName : "there";

  // Build brief conversation memory for context
  const previousTopics = context.slice(-4).map((m: any) => m.content?.toLowerCase() || "");
  const hasPreviousHeadache = previousTopics.some((t: string) => t.includes("headache"));
  const hasPreviousFever = previousTopics.some((t: string) => t.includes("fever"));
  const hasPreviousCough = previousTopics.some((t: string) => t.includes("cough") || t.includes("cold"));

  // Emergency detection
  const emergencyKeywords = ["chest pain", "heart attack", "can t breathe", "cant breathe", "stroke", "seizure", "unconscious", "not breathing", "severe bleeding"];
  const isEmergency = emergencyKeywords.some((kw) => q.includes(kw));

  if (isEmergency) {
    return `**🚨 This is a medical emergency!**

${name}, the symptoms you're describing could be life-threatening. Please call your local emergency number **immediately** or go to the nearest emergency room right now.

**Do NOT:**
- Wait to see if it gets better
- Drive yourself if you're experiencing chest pain or severe symptoms
- Take any medication without medical supervision

**Do:**
- Call emergency services (911 in US, 112 in EU)
- Stay calm and sit or lie down
- Unlock your door so help can enter
- If possible, have someone stay with you

**Common emergency symptoms:**
- Chest pain or pressure
- Sudden severe headache
- One-sided weakness or confusion
- Severe difficulty breathing
- Severe allergic reaction

Please seek emergency care immediately. I'm an AI and cannot provide emergency medical treatment.`;
  }

  // Conditional responses based on conversation history
  if (hasPreviousHeadache && (q.includes("still") || q.includes("not better") || q.includes("worse"))) {
    return `I see your headache is still bothering you, ${name}. Let me help you think through next steps.

**If your headache has lasted more than a few days or is getting worse**, it's worth getting checked out by a healthcare provider. Here's why:

- Persistent headaches can sometimes indicate issues that need treatment
- A doctor can rule out more serious causes
- They can prescribe stronger medications if needed

**What you can do today:**
- Keep a headache diary: note time, triggers, what helps
- Make sure you're drinking enough water (dehydration is a common cause)
- Try a different pain reliever if the first one didn't help (but follow label directions)
- Apply an ice pack to your temples or neck for 15 minutes

**When to see a doctor urgently:**
- Headache with fever and stiff neck
- Vision changes or weakness in limbs
- Headache after a head injury
- "Worst headache of your life" that comes on suddenly

**Quick follow-up:** Has anything triggered it — stress, lack of sleep, certain foods, or screen time?`;
  }

  if (hasPreviousFever && (q.includes("medicine") || q.includes("medication") || q.includes("paracetamol") || q.includes("tablet"))) {
    return `Good question, ${name}. Let me help you understand fever medicines safely.

**Over-the-counter options for fever:**

**Paracetamol / Acetaminophen:**
- Generally the safest first choice
- Reduces fever and relieves pain
- Follow the dosage on the package exactly
- Do not exceed the maximum daily dose

**Ibuprofen:**
- Also reduces fever and inflammation
- Take with food to avoid stomach upset
- Avoid if you have kidney issues or stomach ulcers

**Important safety rules:**
- Never give aspirin to children or teenagers
- Don't alternate medicines unless a doctor advises it
- Always check if you have allergies
- If fever persists beyond 3 days, see a doctor

**For children:**
- Use pediatric formulations only
- Dose by weight, not age
- When in doubt, ask a pharmacist

I can provide general information about how these medicines work, but **the exact dose and whether it's right for you should be confirmed with a pharmacist or doctor**.

**Quick follow-up:** What's your current temperature, and do you have any existing medical conditions?`;
  }

  if (q.includes("headache") || q.includes("migraine") || q.includes("head pain")) {
    return `Hi ${name}, I'm sorry you're dealing with a headache — that can really disrupt your day. Let me help you understand what's going on and what you can do.

**What it might mean:**
Most headaches are caused by tension (stress, posture), dehydration, eye strain, or lack of sleep. They're usually harmless and resolve with rest and hydration.

**What to do now:**
- 💧 **Drink a full glass of water** — dehydration is a very common trigger
- 🛏️ **Rest in a quiet, dark room** if light or noise bothers you
- 🧊 **Apply a cold or warm compress** to your forehead or the back of your neck
- 🧘 **Try gentle neck and shoulder stretches** — tension often sits there
- 😌 **Practice deep breathing** for 2-3 minutes to reduce muscle tension

**When to see a doctor urgently:**
- Sudden, severe "worst headache of your life"
- Headache with fever, stiff neck, confusion, or vision changes
- Headache after a head injury or fall
- Headache that keeps getting worse over several days
- Weakness or numbness on one side of your body

**Quick follow-up:** Is this a new headache for you, or something you've experienced before? Any other symptoms like nausea, sensitivity to light, or neck stiffness?`;
  }

  if (q.includes("fever") || q.includes("temperature") || q.includes("hot body")) {
    return `Hi ${name}, a fever is your body's natural defense mechanism — it's actually working to fight off an infection. But I know it can feel pretty miserable, so let's get you comfortable.

**What it means:**
Fever is typically caused by viral infections (like colds or flu) or bacterial infections. Most fevers between 99°F–102°F (37.2°C–38.9°C) are manageable at home and resolve within a few days.

**What to do now:**
- 💧 **Stay hydrated** — sip water, oral rehydration solutions, warm soups, or herbal tea throughout the day
- 🛏️ **Rest as much as possible** — your body needs energy to fight the infection
- 👕 **Wear light clothing** and keep the room at a comfortable temperature
- 🧊 **Use a damp cloth** on your forehead if you're uncomfortably warm
- 💊 **Paracetamol/acetaminophen** can help reduce fever and discomfort (follow the label directions)

**When to see a doctor:**
- Fever above 103°F (39.4°C) or lasting more than 3 days
- Fever with severe headache, stiff neck, unusual rash, or confusion
- Difficulty breathing or chest pain
- Signs of dehydration (very dark urine, dizziness, dry mouth, no urination for 8+ hours)

**Quick follow-up:** What's your current temperature, and how long have you had the fever? Any other symptoms like cough, sore throat, body aches, or digestive issues?`;
  }

  if (q.includes("cough") || q.includes("cold") || q.includes("flu") || q.includes("sore throat")) {
    return `Hi ${name}, coughs and colds are incredibly common, especially with weather changes. Let me help you feel better and know when to get checked.

**What it likely is:**
Most coughs are caused by viral upper respiratory infections (the common cold), but they can also result from allergies, dry air, acid reflux, or post-nasal drip.

**What to do now:**
- 🍵 **Stay well-hydrated** — warm teas with honey can soothe your throat (honey only for adults and children over 1 year)
- 💨 **Inhale steam** from a bowl of hot water or use a humidifier to loosen mucus
- 🧂 **Gargle with warm salt water** 2-3 times daily to reduce throat inflammation
- 🗣️ **Rest your voice** and avoid smoke, dust, or strong chemical fumes
- 🛏️ **Elevate your head** with an extra pillow when sleeping to reduce nighttime coughing

**Natural soothers:**
- Ginger tea with lemon and honey
- Warm turmeric milk (golden milk)
- Chicken soup — it actually has anti-inflammatory properties!

**When to see a doctor:**
- Cough lasting more than 2-3 weeks
- Coughing up blood or consistently thick green/yellow mucus
- High fever, chest pain, or difficulty breathing
- Wheezing or coughing that significantly worsens at night

**Quick follow-up:** Is your cough **dry and tickly** or **producing mucus/phlegm**? Any fever or shortness of breath?`;
  }

  if (q.includes("diet") || q.includes("food") || q.includes("eat") || q.includes("nutrition")) {
    return `Hi ${name}, I'd love to help you with your diet! Good nutrition is truly the foundation of health, and small changes can make a big difference.

**Simple daily diet template:**

🌅 **Breakfast:**
- Protein + fiber combination
- Options: eggs with whole-grain toast, oatmeal with nuts and berries, Greek yogurt with fruit, or sprouts with lemon

🌞 **Lunch:**
- Balanced plate: half vegetables, quarter protein, quarter whole grains
- Options: dal/rice with vegetables, grilled chicken salad, quinoa bowl, or chapati with paneer and sabzi

🌇 **Evening snack:**
- Nuts, fruit, hummus with vegetables, or a small smoothie
- Avoid fried snacks and sugary biscuits

🌙 **Dinner:**
- Light but nutritious
- Soup and salad, grilled fish with steamed vegetables, or khichdi with curd

**Hydration goal:**
- Aim for 2-3 liters of water daily (unless your doctor has restricted fluids)
- Start your day with a glass of warm water

**Key principles:**
- 🌈 **Eat the rainbow** — different colored vegetables provide different nutrients
- 🍽️ **Don't skip meals** — it slows metabolism and leads to overeating later
- 🍬 **Limit processed foods** — reduce sugar, packaged snacks, and excessive salt
- ⏰ **Eat mindfully** — chew well and avoid screens during meals

**Quick follow-up:** Are you looking to manage a specific condition (like diabetes or BP), lose weight, gain muscle, or just improve your overall health? I can tailor advice based on your goals!`;
  }

  if (q.includes("exercise") || q.includes("workout") || q.includes("gym") || q.includes("fitness")) {
    return `Hi ${name}, regular exercise is one of the best gifts you can give your body and mind! Let me create a realistic plan that you can actually stick to.

**Beginner-friendly weekly plan:**

🏃 **5 days: Cardio (25-30 minutes)**
- Brisk walking, light jogging, cycling, swimming, or dancing
- Start with 10-15 minutes if you're new, and build up gradually

💪 **2-3 days: Strength training**
- Bodyweight exercises at home:
  - Squats (chair squats to start)
  - Wall push-ups
  - Lunges
  - Plank holds (start with 10-20 seconds)
  - Glute bridges

🧘 **Daily: Flexibility (5-10 minutes)**
- Neck rolls, shoulder stretches, hamstring stretches
- Light yoga or stretching before bed

**Tips for consistency:**
- 🎯 **Start small** — even 10 minutes of movement counts!
- 🎵 **Find joy in movement** — choose activities you actually enjoy
- ⏰ **Same time, same place** — build a habit by exercising at a consistent time
- 👟 **Prepare the night before** — lay out your workout clothes
- 📱 **Track your progress** — celebrate small wins

**Important safety note:**
If you have any existing health conditions, chest pain, unexplained breathlessness, or you're over 40 and haven't exercised regularly, please consult your doctor before starting a new exercise routine.

**Quick follow-up:** What's your current activity level, and do you have any specific fitness goals in mind — weight loss, building stamina, managing a condition, or just feeling better?`;
  }

  if (q.includes("sleep") || q.includes("insomnia") || q.includes("can t sleep") || q.includes("tired")) {
    return `Hi ${name}, poor sleep can really cascade into so many other health issues — low energy, irritability, weakened immunity, even weight gain. Let's work on fixing your sleep!

**Sleep hygiene checklist:**

🕐 **Consistent schedule**
- Go to bed and wake up at the same time every day (yes, weekends too!)
- Your body's internal clock loves consistency

🌙 **Wind-down routine (30-60 minutes before bed)**
- Dim the lights
- Read a physical book (not a screen!)
- Take a warm bath or shower
- Try light stretching or meditation

📵 **Screen curfew**
- Avoid phones, tablets, TVs, and computers for at least 1 hour before bed
- Blue light suppresses melatonin, your sleep hormone

🛏️ **Optimize your bedroom**
- Cool temperature (around 65°F/18°C is ideal)
- Dark room — consider blackout curtains or an eye mask
- Quiet — use earplugs or white noise if needed
- Comfortable mattress and pillows

🍽️ **Diet considerations**
- Finish eating 2-3 hours before bed
- Avoid caffeine after 2 PM
- Limit alcohol — it may help you fall asleep but disrupts deep sleep
- A small snack with tryptophan (banana, warm milk, nuts) can help

**Breathi
