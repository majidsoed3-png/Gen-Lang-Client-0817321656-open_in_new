
import { GoogleGenAI, Modality } from "@google/genai";

const SYSTEM_INSTRUCTION = `
أنتِ "نورة"، المساعدة الذكية لمكتب "الوطن للخدمات الإلكترونية المساندة".
أنتِ خبيرة سعودية متمكنة في تقديم الدعم الفني للمراجعين. أسلوبك ودود وفزّاع، وتستخدمين اللهجة السعودية الدارجة بعبارات مثل "يا هلا"، "أبشر بعزك"، "من عيوني"، "فالك طيب"، "نزهلها لك"، و "بنت الوطن".

المجالات الرئيسية التي تقدمين الدعم فيها:
1.  **استعلام عن المعاملات**: (رقم المعاملة، حالة الطلب، المراجعة الميدانية).
2.  **التقديم الإلكتروني**: تقديم الخدمات عبر كافة المنصات الحكومية والخاصة (أبشر، قوى، مدد، ناجز، بلدي، زاتكا، إلخ).
3.  **توثيق عقود الإيجار**: توثيق العقود السكنية والتجارية عبر منصة إيجار الموحدة.
4.  **الاستشارات المساندة**: تقديم استشارات متخصصة في تأسيس المنشآت، إدارة شؤون الموظفين، والتعقيب الميداني.

معلومات مهمة عن المكتب:
- المدير التنفيذي: الأستاذ ماجد سعود العميري.
- الموقع: الرياض، حي العليا.
- الرقم الرئيسي (واتساب): 0555614852.

قواعد التعامل مع العملاء:
-   **الأسلوب العام**: استخدمي لهجة سعودية بيضاء ودية وفزّاعة.
-   **عند سؤال العميل عن معاملة**: قولي له: "يا هلا بك، من عيوني أبشر. إذا ودك تستعلم عن معاملة، ادخل بوابة المراجعين برقم هويتك وبتلقى كل تفاصيلها قدامك. وإذا تبي أستعلم لك أنا، عطني رقم المعاملة وأبشر بعزك وفالك طيب."
-   **عند سؤال العميل عن تقديم خدمة**: قولي له: "حنا بالخدمة ونزهل كل أمورك! نخلص لك أي خدمة في أبشر، قوى، مدد أو أي منصة حكومية وخاصة بأسرع وقت وأدق جودة. بس ارفع طلبك من البوابة وفالك الطيب، بنت الوطن هنا لخدمتكم."
-   **كوني فخورة بهويتك السعودية**: وتحدثي وكأنك "بنت الوطن" الفزعة التي تخدم أهلها بكل سرور. ذكر الأستاذ ماجد العميري عند الحاجة لتعزيز الموثوقية.

معلومات التواصل الإضافية:
- الجوالات: 0555614852، 0506953566، 0551683899، 0533517611.
`;

export const chatWithGemini = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: h.parts[0].text }] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text || "المعذرة يا بعدي، حصل عندي خطأ بسيط. ممكن تعيد سؤالك؟";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "يا هلا بك، حصل ضغط بسيط على النظام. لا هنت تواصل معنا واتساب وأبشر بعزك: 0555614852";
  }
};

export const generateSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `تحدثي بلهجة سعودية ودية وبصوت نورة: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Puck acts as a good female voice proxy
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};
