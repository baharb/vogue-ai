'use client'

import { useState, useRef, useEffect, createContext, useContext } from 'react'

// ═══════════════════════════════════════════════════════════════
// VOGUE AI — Elite Fashion Stylist App
// - Calls your Vercel backend (Gemini key hidden on server)
// - Users never see or enter any API key
// - Persistent storage (history & profile survive refresh)
// - Multi-language support: EN, FA, ES, FR, ZH, JA, AR
// ═══════════════════════════════════════════════════════════════

// ─── LANGUAGE SYSTEM ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', dir: 'ltr' },
  { code: 'fa', label: 'FA', name: 'فارسی', dir: 'rtl' },
  { code: 'es', label: 'ES', name: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'FR', name: 'Français', dir: 'ltr' },
  { code: 'zh', label: 'ZH', name: '中文', dir: 'ltr' },
  { code: 'ja', label: 'JA', name: '日本語', dir: 'ltr' },
  { code: 'ar', label: 'AR', name: 'العربية', dir: 'rtl' },
]

const T = {
  en: {
    appName: 'VOGUE AI', loading: 'Loading VOGUE AI...', back: '← Back',
    rate: 'Rate', wardrobe: 'Wardrobe', explore: 'Explore', profile: 'Profile',
    rateTitle: 'Rate My', rateGold: 'Outfit', rateSubtitle: 'Upload a photo for instant AI analysis',
    uploadTitle: 'Upload Your Outfit', uploadSub: 'Mirror selfie or full-body photo\nNatural lighting works best',
    takePhoto: 'Take Photo', changePhoto: 'Change Photo',
    occasion: 'Occasion', styleVibe: 'Style Vibe', gender: 'Gender',
    analyze: '✦ Analyze My Outfit', step: 'Step',
    overview: 'Overview', improve: 'Improve', askStylist: 'Ask Stylist',
    whatWorks: "✓ What's Working", powerMove: '⚡ Power Move',
    saveLook: 'Save Look', saved: '✓ Saved!', rateAnother: 'Rate Another',
    wardrobeTitle: 'My', wardrobeGold: 'Wardrobe', wardrobeSub: 'Saved looks & style history',
    noLooks: 'No saved looks yet', noLooksSub: 'Rate an outfit and save it\nto build your wardrobe',
    exploreTitle: 'Style', exploreGold: 'Explore', exploreSub: 'Ask your AI stylist anything',
    askPlaceholder: 'Ask any fashion question...', ask: 'Ask',
    profileTitle: 'Style', profileGold: 'DNA', profileSub: 'Your fashion identity',
    edit: 'Edit', save: 'Save', styleReport: '✦ Your Style Report', bestLook: '🏆 Your Best Look',
    chatPlaceholder: 'Ask your stylist anything...', thinking: 'Thinking...',
    outfitsRated: 'Outfits Rated', avgScore: 'Avg Score', topArchetype: 'Top Archetype', favOccasion: 'Fav Occasion',
    sort: 'Sort:', latest: 'Latest', topScore: 'Top Score',
    startBtn: '✦ Start Styling — Free', noSignIn: 'No sign-in required to start',
    detectedPalette: 'Detected palette:', styleArchetype: 'Style Archetype',
    improvementsIntro: 'Exact changes, in priority order:',
    outfits: 'Outfits', avg: 'Avg Score', best: 'Best',
    langInstruction: 'Respond in English.',
  },
  fa: {
    appName: 'VOGUE AI', loading: 'در حال بارگذاری...', back: '→ بازگشت',
    rate: 'ارزیابی', wardrobe: 'کمد لباس', explore: 'کاوش', profile: 'پروفایل',
    rateTitle: 'ارزیابی', rateGold: 'استایل', rateSubtitle: 'عکس آپلود کن برای تحلیل فوری',
    uploadTitle: 'عکس استایلت را آپلود کن', uploadSub: 'سلفی جلوی آینه یا عکس تمام قد\nنور طبیعی بهترین نتیجه را می‌دهد',
    takePhoto: 'عکس بگیر', changePhoto: 'تغییر عکس',
    occasion: 'مناسبت', styleVibe: 'سبک', gender: 'جنسیت',
    analyze: '✦ تحلیل استایل من', step: 'مرحله',
    overview: 'مرور کلی', improve: 'بهبود', askStylist: 'سوال از استایلیست',
    whatWorks: '✓ چه چیزی خوب است', powerMove: '⚡ حرکت قدرتمند',
    saveLook: 'ذخیره لوک', saved: '✓ ذخیره شد!', rateAnother: 'ارزیابی جدید',
    wardrobeTitle: 'کمد', wardrobeGold: 'لباس', wardrobeSub: 'لوک‌های ذخیره شده',
    noLooks: 'هنوز لوکی ذخیره نشده', noLooksSub: 'یک استایل ارزیابی کن و ذخیره کن',
    exploreTitle: 'کاوش', exploreGold: 'استایل', exploreSub: 'هر سوال مد و فشن بپرس',
    askPlaceholder: 'سوالت را بنویس...', ask: 'بپرس',
    profileTitle: 'هویت', profileGold: 'استایل', profileSub: 'شناسنامه فشن تو',
    edit: 'ویرایش', save: 'ذخیره', styleReport: '✦ گزارش استایل', bestLook: '🏆 بهترین لوک',
    chatPlaceholder: 'هر چیزی از استایلیست بپرس...', thinking: 'در حال فکر...',
    outfitsRated: 'ارزیابی شده', avgScore: 'میانگین', topArchetype: 'سبک اصلی', favOccasion: 'مناسبت برتر',
    sort: 'مرتب‌سازی:', latest: 'جدیدترین', topScore: 'بالاترین امتیاز',
    startBtn: '✦ شروع رایگان', noSignIn: 'بدون نیاز به ورود',
    detectedPalette: 'رنگ‌بندی:', styleArchetype: 'تیپ استایل',
    improvementsIntro: 'تغییرات دقیق، به ترتیب اولویت:',
    outfits: 'استایل', avg: 'میانگین', best: 'بهترین',
    langInstruction: 'لطفاً به فارسی پاسخ بده.',
  },
  es: {
    appName: 'VOGUE AI', loading: 'Cargando VOGUE AI...', back: '← Volver',
    rate: 'Valorar', wardrobe: 'Armario', explore: 'Explorar', profile: 'Perfil',
    rateTitle: 'Valorar mi', rateGold: 'Outfit', rateSubtitle: 'Sube una foto para análisis instantáneo',
    uploadTitle: 'Sube tu outfit', uploadSub: 'Selfie frente al espejo o foto de cuerpo entero\nMejor con luz natural',
    takePhoto: 'Tomar foto', changePhoto: 'Cambiar foto',
    occasion: 'Ocasión', styleVibe: 'Estilo', gender: 'Género',
    analyze: '✦ Analizar mi outfit', step: 'Paso',
    overview: 'Resumen', improve: 'Mejorar', askStylist: 'Preguntar',
    whatWorks: '✓ Lo que funciona', powerMove: '⚡ Movimiento clave',
    saveLook: 'Guardar look', saved: '✓ Guardado!', rateAnother: 'Otro outfit',
    wardrobeTitle: 'Mi', wardrobeGold: 'Armario', wardrobeSub: 'Looks guardados',
    noLooks: 'Sin looks guardados', noLooksSub: 'Valora un outfit y guárdalo',
    exploreTitle: 'Explorar', exploreGold: 'Estilo', exploreSub: 'Pregunta lo que quieras',
    askPlaceholder: 'Pregunta sobre moda...', ask: 'Preguntar',
    profileTitle: 'ADN de', profileGold: 'Estilo', profileSub: 'Tu identidad de moda',
    edit: 'Editar', save: 'Guardar', styleReport: '✦ Tu informe de estilo', bestLook: '🏆 Tu mejor look',
    chatPlaceholder: 'Pregunta a tu estilista...', thinking: 'Pensando...',
    outfitsRated: 'Outfits', avgScore: 'Promedio', topArchetype: 'Arquetipo', favOccasion: 'Ocasión fav',
    sort: 'Ordenar:', latest: 'Recientes', topScore: 'Mejor puntuación',
    startBtn: '✦ Empezar gratis', noSignIn: 'Sin registro necesario',
    detectedPalette: 'Paleta detectada:', styleArchetype: 'Arquetipo de estilo',
    improvementsIntro: 'Cambios exactos, por orden de prioridad:',
    outfits: 'Outfits', avg: 'Promedio', best: 'Mejor',
    langInstruction: 'Responde en español.',
  },
  fr: {
    appName: 'VOGUE AI', loading: 'Chargement de VOGUE AI...', back: '← Retour',
    rate: 'Évaluer', wardrobe: 'Garde-robe', explore: 'Explorer', profile: 'Profil',
    rateTitle: 'Évaluer ma', rateGold: 'Tenue', rateSubtitle: 'Télécharge une photo pour une analyse instantanée',
    uploadTitle: 'Télécharge ta tenue', uploadSub: 'Selfie devant miroir ou photo en pied\nMeilleur avec lumière naturelle',
    takePhoto: 'Prendre photo', changePhoto: 'Changer la photo',
    occasion: 'Occasion', styleVibe: 'Style', gender: 'Genre',
    analyze: '✦ Analyser ma tenue', step: 'Étape',
    overview: 'Aperçu', improve: 'Améliorer', askStylist: 'Demander',
    whatWorks: '✓ Ce qui fonctionne', powerMove: '⚡ Conseil clé',
    saveLook: 'Sauvegarder', saved: '✓ Sauvegardé!', rateAnother: 'Autre tenue',
    wardrobeTitle: 'Ma', wardrobeGold: 'Garde-robe', wardrobeSub: 'Looks sauvegardés',
    noLooks: 'Aucun look sauvegardé', noLooksSub: 'Évalue une tenue et sauvegarde-la',
    exploreTitle: 'Explorer', exploreGold: 'le Style', exploreSub: 'Pose toutes tes questions mode',
    askPlaceholder: 'Une question sur la mode...', ask: 'Demander',
    profileTitle: 'ADN de', profileGold: 'Style', profileSub: 'Ton identité mode',
    edit: 'Modifier', save: 'Sauvegarder', styleReport: '✦ Ton rapport de style', bestLook: '🏆 Ton meilleur look',
    chatPlaceholder: 'Demande à ton styliste...', thinking: 'Réflexion...',
    outfitsRated: 'Tenues', avgScore: 'Moyenne', topArchetype: 'Archétype', favOccasion: 'Occasion fav',
    sort: 'Trier:', latest: 'Récents', topScore: 'Meilleur score',
    startBtn: '✦ Commencer gratuitement', noSignIn: 'Sans inscription',
    detectedPalette: 'Palette détectée:', styleArchetype: 'Archétype de style',
    improvementsIntro: 'Changements précis, par ordre de priorité:',
    outfits: 'Tenues', avg: 'Moyenne', best: 'Meilleur',
    langInstruction: 'Réponds en français.',
  },
  zh: {
    appName: 'VOGUE AI', loading: '加载中...', back: '← 返回',
    rate: '评分', wardrobe: '衣橱', explore: '探索', profile: '个人',
    rateTitle: '评价我的', rateGold: '穿搭', rateSubtitle: '上传照片获取即时AI分析',
    uploadTitle: '上传你的穿搭', uploadSub: '镜子自拍或全身照\n自然光效果最佳',
    takePhoto: '拍照', changePhoto: '更换照片',
    occasion: '场合', styleVibe: '风格', gender: '性别',
    analyze: '✦ 分析我的穿搭', step: '步骤',
    overview: '总览', improve: '改进', askStylist: '咨询造型师',
    whatWorks: '✓ 优点', powerMove: '⚡ 关键建议',
    saveLook: '保存造型', saved: '✓ 已保存!', rateAnother: '评价新造型',
    wardrobeTitle: '我的', wardrobeGold: '衣橱', wardrobeSub: '保存的造型记录',
    noLooks: '还没有保存的造型', noLooksSub: '评价一个造型并保存它',
    exploreTitle: '时尚', exploreGold: '探索', exploreSub: '向AI造型师提问任何时尚问题',
    askPlaceholder: '提问任何时尚问题...', ask: '提问',
    profileTitle: '风格', profileGold: '基因', profileSub: '你的时尚身份',
    edit: '编辑', save: '保存', styleReport: '✦ 你的风格报告', bestLook: '🏆 你的最佳造型',
    chatPlaceholder: '向造型师提问...', thinking: '思考中...',
    outfitsRated: '已评分', avgScore: '平均分', topArchetype: '主要风格', favOccasion: '常见场合',
    sort: '排序:', latest: '最新', topScore: '最高分',
    startBtn: '✦ 免费开始', noSignIn: '无需注册',
    detectedPalette: '检测到的色调:', styleArchetype: '风格原型',
    improvementsIntro: '具体改进建议，按优先级排列:',
    outfits: '造型', avg: '平均', best: '最佳',
    langInstruction: '请用中文回答。',
  },
  ja: {
    appName: 'VOGUE AI', loading: '読み込み中...', back: '← 戻る',
    rate: '評価', wardrobe: 'ワードローブ', explore: '探索', profile: 'プロフィール',
    rateTitle: 'コーデを', rateGold: '評価', rateSubtitle: '写真をアップして即時AI分析',
    uploadTitle: 'コーデをアップロード', uploadSub: '鏡の前のセルフィーまたは全身写真\n自然光が最も効果的',
    takePhoto: '写真を撮る', changePhoto: '写真を変更',
    occasion: 'シーン', styleVibe: 'スタイル', gender: '性別',
    analyze: '✦ コーデを分析する', step: 'ステップ',
    overview: '概要', improve: '改善', askStylist: 'スタイリストに聞く',
    whatWorks: '✓ 良い点', powerMove: '⚡ 重要なアドバイス',
    saveLook: '保存', saved: '✓ 保存済み!', rateAnother: '別のコーデ',
    wardrobeTitle: 'マイ', wardrobeGold: 'ワードローブ', wardrobeSub: '保存したコーデ',
    noLooks: 'まだ保存したコーデがありません', noLooksSub: 'コーデを評価して保存しましょう',
    exploreTitle: 'ファッション', exploreGold: '探索', exploreSub: 'AIスタイリストに何でも聞いて',
    askPlaceholder: 'ファッションの質問を入力...', ask: '質問する',
    profileTitle: 'スタイル', profileGold: 'DNA', profileSub: 'あなたのファッションアイデンティティ',
    edit: '編集', save: '保存', styleReport: '✦ スタイルレポート', bestLook: '🏆 ベストコーデ',
    chatPlaceholder: 'スタイリストに質問...', thinking: '考え中...',
    outfitsRated: '評価済み', avgScore: '平均点', topArchetype: 'メインスタイル', favOccasion: 'よく使うシーン',
    sort: '並び替え:', latest: '最新', topScore: '高評価順',
    startBtn: '✦ 無料で始める', noSignIn: '登録不要',
    detectedPalette: '検出カラー:', styleArchetype: 'スタイルアーキタイプ',
    improvementsIntro: '優先順位の高い改善点:',
    outfits: 'コーデ', avg: '平均', best: 'ベスト',
    langInstruction: '日本語で答えてください。',
  },
  ar: {
    appName: 'VOGUE AI', loading: 'جارٍ التحميل...', back: 'رجوع →',
    rate: 'تقييم', wardrobe: 'خزانة الملابس', explore: 'استكشاف', profile: 'الملف',
    rateTitle: 'قيّم', rateGold: 'إطلالتي', rateSubtitle: 'ارفع صورة للحصول على تحليل فوري',
    uploadTitle: 'ارفع صورة إطلالتك', uploadSub: 'سيلفي أمام المرآة أو صورة كاملة\nالإضاءة الطبيعية الأفضل',
    takePhoto: 'التقط صورة', changePhoto: 'تغيير الصورة',
    occasion: 'المناسبة', styleVibe: 'الأسلوب', gender: 'الجنس',
    analyze: '✦ حلّل إطلالتي', step: 'خطوة',
    overview: 'نظرة عامة', improve: 'تحسين', askStylist: 'اسأل المصمم',
    whatWorks: '✓ ما يعمل بشكل جيد', powerMove: '⚡ النصيحة الذهبية',
    saveLook: 'حفظ الإطلالة', saved: '✓ تم الحفظ!', rateAnother: 'إطلالة أخرى',
    wardrobeTitle: 'خزانة', wardrobeGold: 'ملابسي', wardrobeSub: 'الإطلالات المحفوظة',
    noLooks: 'لا توجد إطلالات محفوظة', noLooksSub: 'قيّم إطلالة واحفظها',
    exploreTitle: 'استكشاف', exploreGold: 'الأزياء', exploreSub: 'اسأل مصممك عن أي شيء',
    askPlaceholder: 'اكتب سؤالك عن الموضة...', ask: 'اسأل',
    profileTitle: 'هوية', profileGold: 'أسلوبك', profileSub: 'شخصيتك في الموضة',
    edit: 'تعديل', save: 'حفظ', styleReport: '✦ تقرير أسلوبك', bestLook: '🏆 أفضل إطلالة',
    chatPlaceholder: 'اسأل مصممك أي شيء...', thinking: 'أفكر...',
    outfitsRated: 'إطلالات', avgScore: 'المتوسط', topArchetype: 'الأسلوب الرئيسي', favOccasion: 'المناسبة المفضلة',
    sort: 'ترتيب:', latest: 'الأحدث', topScore: 'الأعلى تقييماً',
    startBtn: '✦ ابدأ مجاناً', noSignIn: 'بدون تسجيل',
    detectedPalette: 'لوحة الألوان:', styleArchetype: 'نمط الأسلوب',
    improvementsIntro: 'تغييرات محددة، بترتيب الأولوية:',
    outfits: 'إطلالات', avg: 'متوسط', best: 'أفضل',
    langInstruction: 'أجب باللغة العربية.',
  },
}

const LangContext = createContext({ lang: 'en', t: T.en, setLang: () => {} })

const BACKEND_URL = 'https://your-app.vercel.app' // ← Change this after deploying

// ─── STYLES ──────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0A0806;--surface:#111009;--card:#181410;--border:#2A2318;
  --gold:#C8A96E;--gold2:#E8C98E;--gold-dim:rgba(200,169,110,0.1);
  --cream:#F2EAD8;--muted:#7A6E5E;--faint:#3A3228;
  --red:#B85450;--green:#6B9E78;--r2:rgba(200,169,110,0.2);
}
html,body{background:var(--bg);font-family:'Jost',sans-serif;min-height:100vh;color:var(--cream);overflow-x:hidden}
::-webkit-scrollbar{width:2px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px}
.app{min-height:100vh}
.app::after{content:'';position:fixed;inset:0;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:9999}

.serif{font-family:'Cormorant Garamond',serif}
.italic{font-style:italic}

@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes scalePop{from{transform:scale(.88);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes slideIn{from{transform:translateX(-8px);opacity:0}to{transform:translateX(0);opacity:1}}
.au{animation:fadeUp .45s cubic-bezier(.22,1,.36,1) both}
.ap{animation:scalePop .4s cubic-bezier(.34,1.56,.64,1) both}
.as{animation:slideIn .35s ease both}
.pulse{animation:pulse 2s ease-in-out infinite}
.spin{animation:spin 1s linear infinite}

.btn{background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--bg);border:none;cursor:pointer;padding:15px 28px;border-radius:3px;font-family:'Jost',sans-serif;font-size:14px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;transition:all .25s;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(200,169,110,.3)}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.btn-o{background:transparent;border:1px solid var(--border);color:var(--cream);cursor:pointer;padding:12px 22px;border-radius:3px;font-family:'Jost',sans-serif;font-size:13px;transition:all .2s}
.btn-o:hover{border-color:var(--gold);color:var(--gold)}

.card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:18px}
.card-g{background:var(--card);border:1px solid rgba(200,169,110,.2);border-radius:6px;padding:18px;box-shadow:0 0 28px rgba(200,169,110,.04)}

.chip{padding:8px 15px;border-radius:2px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-size:12px;font-family:'Jost',sans-serif;font-weight:500;letter-spacing:.4px;transition:all .2s;white-space:nowrap}
.chip:hover{border-color:var(--gold);color:var(--cream)}
.chip.on{background:var(--gold);color:var(--bg);border-color:var(--gold);font-weight:600}

.score-ring{position:relative;display:inline-flex;align-items:center;justify-content:center}
.score-ring svg{transform:rotate(-90deg)}
.score-inner{position:absolute;text-align:center;pointer-events:none}

.prog{height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;flex:1}
.prog-f{height:100%;border-radius:2px;transition:width 1.2s cubic-bezier(.22,1,.36,1)}

.inp{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:4px;padding:12px 16px;color:var(--cream);font-family:'Jost',sans-serif;font-size:14px;outline:none;width:100%;transition:border .2s}
.inp:focus{border-color:var(--gold)}
.inp::placeholder{color:var(--muted)}

.upload{border:1px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .3s;position:relative;overflow:hidden}
.upload:hover{border-color:var(--gold);background:var(--gold-dim)}

.bnav{position:fixed;bottom:0;left:0;right:0;background:rgba(10,8,6,.94);border-top:1px solid var(--border);display:flex;justify-content:space-around;padding:10px 0 22px;backdrop-filter:blur(24px);z-index:200}
.bnav-btn{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:4px 20px;transition:all .2s;border:none;background:none}
.bnav-btn.on .ni,.bnav-btn.on .nl{color:var(--gold)}
.bnav-btn:not(.on) .ni,.bnav-btn:not(.on) .nl{color:var(--muted)}
.ni{font-size:20px;transition:transform .2s}
.bnav-btn.on .ni{transform:scale(1.15)}
.nl{font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:500}

.tabs{display:flex;border-bottom:1px solid var(--border)}
.tab{flex:1;padding:10px 0;background:none;border:none;cursor:pointer;font-size:12px;letter-spacing:.8px;text-transform:uppercase;font-family:'Jost',sans-serif;font-weight:500;transition:all .2s;border-bottom:2px solid transparent;margin-bottom:-1px}
.tab.on{color:var(--gold);border-bottom-color:var(--gold)}
.tab:not(.on){color:var(--muted)}

.div{height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,110,.18),transparent);margin:18px 0}

.ph{border-left:3px solid var(--red)}
.pm{border-left:3px solid var(--gold)}
.pl{border-left:3px solid var(--green)}

.hcard{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--border);border-radius:5px;padding:12px;cursor:pointer;transition:all .2s}
.hcard:hover{border-color:rgba(200,169,110,.28);transform:translateX(3px)}

.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}

input[type=file]{display:none}
.mx{max-width:480px;margin:0 auto;width:100%}
.px{padding-left:20px;padding-right:20px}
.pb{padding-bottom:90px}
`

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const OCCASIONS = ['Casual', 'Work', 'Date Night', 'Event', 'Travel', 'Brunch', 'Night Out', 'Gym']
const VIBES = ['Minimal', 'Classic', 'Streetwear', 'Romantic', 'Edgy', 'Bohemian', 'Preppy', 'Luxe']
const GENDERS = ["Women's", "Men's", 'Unisex']
const CAT_ICONS = {
  'Color Harmony': '🎨', 'Fit & Proportions': '📐', 'Occasion Match': '🎯',
  'Trend Awareness': '🔥', 'Accessories': '💎', 'Fabric & Texture': '🧵', 'Overall Vibe': '✨'
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const scoreColor = s => s >= 8 ? 'var(--green)' : s >= 6 ? 'var(--gold)' : 'var(--red)'
const scoreLabel = s => s >= 9 ? 'Exceptional' : s >= 8 ? 'Excellent' : s >= 7 ? 'Strong' : s >= 6 ? 'Good' : s >= 5 ? 'Fair' : 'Needs Work'

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}
function resizeImage(file, maxPx = 1024) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      c.toBlob(b => resolve(b), 'image/jpeg', 0.85)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

// ─── PERSISTENT STORAGE ───────────────────────────────────────────────────────
async function storageGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null }
  catch { return null }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); return true }
  catch { return false }
}

// ─── API CALLS → YOUR VERCEL BACKEND ─────────────────────────────────────────
// Key is hidden on your server — users never see it

async function apiAnalyze(imageBase64, occasion, vibe, gender, langInstruction = '') {
  const res = await fetch(`${BACKEND_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, occasion, vibe, gender, langInstruction })
  })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Analysis failed') }
  const data = await res.json()
  return data.result
}

async function apiChat(message, context, history) {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history })
  })
  if (!res.ok) throw new Error('Chat failed')
  const data = await res.json()
  return data.reply
}

async function apiExplore(question) {
  const res = await fetch(`${BACKEND_URL}/api/explore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
  if (!res.ok) throw new Error('Explore failed')
  const data = await res.json()
  return data.answer
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGN-IN MODULE — commented out, ready to activate when needed
// ═══════════════════════════════════════════════════════════════════════════════
//
// HOW TO ACTIVATE:
// 1. npm install next-auth
// 2. Create /app/api/auth/[...nextauth]/route.js
// 3. Add to .env.local:
//      GOOGLE_CLIENT_ID=from_google_cloud_console
//      GOOGLE_CLIENT_SECRET=from_google_cloud_console
//      NEXTAUTH_SECRET=run: openssl rand -base64 32
//      NEXTAUTH_URL=https://your-app.vercel.app
// 4. Uncomment SignInScreen below
// 5. Uncomment the auth check inside the App component
//
// function SignInScreen({ onSkip }) {
//   const [loading, setLoading] = useState(false)
//   return (
//     <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 20px' }}>
//       <div style={{ maxWidth:380, margin:'0 auto', width:'100%', textAlign:'center' }}>
//         <div style={{ fontSize:48, marginBottom:20 }}>✦</div>
//         <h1 className="serif" style={{ fontSize:36, marginBottom:12 }}>Welcome to VOGUE AI</h1>
//         <p style={{ color:'var(--muted)', marginBottom:40, fontSize:14, lineHeight:1.6 }}>
//           Sign in to save your outfits and sync across all your devices
//         </p>
//         <button className="btn" style={{ width:'100%', marginBottom:12 }}
//           onClick={async () => {
//             setLoading(true)
//             // import { signIn } from 'next-auth/react'
//             // await signIn('google', { callbackUrl: '/' })
//           }}>
//           {loading ? 'Signing in...' : 'Continue with Google'}
//         </button>
//         <button className="btn-o" style={{ width:'100%', fontSize:13 }} onClick={onSkip}>
//           Continue without signing in
//         </button>
//         <p style={{ marginTop:16, fontSize:11, color:'var(--muted)' }}>Your data stays private</p>
//       </div>
//     </div>
//   )
// }
//
// ── In App component, replace setAppState('welcome') with: ──────────────────
// import { useSession } from 'next-auth/react'
// const { data: session, status } = useSession()
// if (status === 'loading') return <LoadingScreen />
// if (!session) return <SignInScreen onSkip={() => setAppState('welcome')} />
// ═══════════════════════════════════════════════════════════════════════════════

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────

function Spinner({ size = 18, color = 'var(--bg)' }) {
  return <div className="spin" style={{ width: size, height: size, border: `2px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
}

function ScoreRing({ score, size = 120 }) {
  const r = 50, c = 2 * Math.PI * r, fill = (score / 10) * c, col = scoreColor(score)
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="7" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={col} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={`${fill} ${c}`}
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="score-inner">
        <div className="serif" style={{ fontSize: size * .26, fontWeight: 700, color: col, lineHeight: 1 }}>{score.toFixed(1)}</div>
        <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{scoreLabel(score)}</div>
      </div>
    </div>
  )
}

function ProgBar({ value }) {
  return <div className="prog"><div className="prog-f" style={{ width: `${value * 10}%`, background: scoreColor(value) }} /></div>
}

function LangPicker() {
  const { lang, setLang } = useContext(LangContext)
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find(l => l.code === lang)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', borderRadius: 3, padding: '5px 10px', color: 'var(--gold)', cursor: 'pointer', fontSize: 11, fontFamily: "'Jost',sans-serif", fontWeight: 600, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
        🌐 {current?.label} <span style={{ fontSize: 8, opacity: .6 }}>▼</span>
      </button>
      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 997 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1a1612', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', zIndex: 998, minWidth: 150, boxShadow: '0 12px 40px rgba(0,0,0,.8)' }}>
            <div style={{ padding: '8px 14px 6px', fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Language</div>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: lang === l.code ? 'rgba(200,169,110,.12)' : 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,.03)', color: lang === l.code ? 'var(--gold)' : 'var(--cream)', cursor: 'pointer', fontSize: 13, fontFamily: "'Jost',sans-serif", textAlign: 'left', transition: 'background .15s' }}>
                <span style={{ fontSize: 10, opacity: .5, minWidth: 22, fontWeight: 700 }}>{l.label}</span>
                <span style={{ direction: l.dir }}>{l.name}</span>
                {lang === l.code && <span style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TopBar({ showBack, onBack }) {
  const { t } = useContext(LangContext)
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(10,8,6,.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✦</div>
        <span className="serif" style={{ fontSize: 17, letterSpacing: -.3 }}>VOGUE <span className="italic" style={{ color: 'var(--gold)' }}>AI</span></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showBack && <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, fontFamily: "'Jost',sans-serif" }}>{t.back}</button>}
        <LangPicker />
      </div>
    </div>
  )
}

function BottomNav({ active, onChange }) {
  const items = [
    { id: 'rate', icon: '📸', label: 'Rate' },
    { id: 'wardrobe', icon: '👗', label: 'Wardrobe' },
    { id: 'explore', icon: '🔍', label: 'Explore' },
    { id: 'profile', icon: '✦', label: 'Profile' },
  ]
  return (
    <nav className="bnav">
      {items.map(it => (
        <button key={it.id} className={`bnav-btn ${active === it.id ? 'on' : ''}`} onClick={() => onChange(it.id)}>
          <span className="ni">{it.icon}</span>
          <span className="nl">{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ─── WELCOME SCREEN ───────────────────────────────────────────────────────────
function WelcomeScreen({ onStart }) {
  const feats = [
    { icon: '📸', t: 'Photo → instant AI rating' }, { icon: '🎯', t: 'Occasion-aware analysis' },
    { icon: '💡', t: 'Specific actionable tips' }, { icon: '💬', t: 'Chat with your stylist' },
    { icon: '👗', t: 'Wardrobe history' }, { icon: '🧬', t: 'Personal Style DNA' },
    { icon: '🔍', t: 'Fashion Q&A' }, { icon: '📈', t: 'Track your progress' },
  ]
  return (
    <div className="au" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '60px 0 40px' }}>
      <div className="mx px" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>✦</div>
          <span style={{ fontSize: 11, letterSpacing: 2.5, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>VOGUE AI</span>
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="serif" style={{ fontSize: 60, lineHeight: 1, marginBottom: 20, letterSpacing: -1.5 }}>
            Your<br /><span style={{ color: 'var(--gold)' }} className="italic">Personal</span><br />Stylist.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 300, marginBottom: 40 }}>
            Upload any outfit. Get an honest AI score, exact fixes, and style advice that actually elevates your look.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 44 }}>
            {feats.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, color: 'var(--cream)' }}>
                <span style={{ fontSize: 14 }}>{f.icon}</span>{f.t}
              </div>
            ))}
          </div>
          <div className="card-g" style={{ marginBottom: 36, borderLeft: '2px solid var(--gold)' }}>
            <p className="serif italic" style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--cream)', marginBottom: 8 }}>
              "It told me exactly what was off — I had been making the same mistake for years."
            </p>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>— Sofia R. · ⭐⭐⭐⭐⭐</span>
          </div>
        </div>
        <div>
          <button className="btn" onClick={onStart} style={{ width: '100%', fontSize: 14, padding: '18px' }}>✦ Start Styling — Free</button>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>No sign-in required to start</p>
        </div>
      </div>
      <div style={{ position: 'fixed', top: -100, right: -100, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,169,110,.05) 0%,transparent 70%)', pointerEvents: 'none' }} />
    </div>
  )
}

// ─── RATE SCREEN ──────────────────────────────────────────────────────────────
function RateScreen({ onResult, savedVibe }) {
  const { t, lang } = useContext(LangContext)
  const [img, setImg] = useState(null)
  const [file, setFile] = useState(null)
  const [occasion, setOccasion] = useState('Casual')
  const [vibe, setVibe] = useState(savedVibe || '')
  const [gender, setGender] = useState('Unisex')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef()

  const handleFile = async f => {
    if (!f) return
    setFile(f)
    const url = await fileToDataURL(f)
    setImg(url)
    setTimeout(() => setStep(2), 300)
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true); setErr('')
    try {
      setProgress('Resizing image...')
      const resized = await resizeImage(file, 1024)
      setProgress('Sending to AI stylist...')
      const b64 = await fileToBase64(resized)
      setProgress('Analyzing your outfit...')
      const result = await apiAnalyze(b64, occasion, vibe, gender, T[lang]?.langInstruction || '')
      onResult({ result, imageUrl: img, occasion, vibe, gender, timestamp: Date.now() })
    } catch (e) {
      setErr(e.message || 'Analysis failed. Make sure your Vercel backend is deployed and BACKEND_URL is set correctly in App.jsx.')
    }
    setLoading(false); setProgress('')
  }

  return (
    <div className="pb" style={{ paddingTop: 60 }}>
      <div className="mx px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 className="serif" style={{ fontSize: 30 }}>Rate My <span className="italic" style={{ color: 'var(--gold)' }}>Outfit</span></h2>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Upload a photo for instant AI analysis</p>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 12 }}>Step {step}/3</div>
        </div>

        <div className="upload au" style={{ height: img ? 300 : 260, marginBottom: 24 }} onClick={() => !loading && fileRef.current?.click()}>
          {img ? (
            <>
              <img src={img} alt="outfit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,8,6,.8) 0%,transparent 55%)', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                <button className="btn-o" style={{ fontSize: 12 }} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>Change Photo</button>
              </div>
            </>
          ) : (
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 52 }}>📸</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Upload Your Outfit</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Mirror selfie or full-body photo<br />Natural lighting works best</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {['💡 Good lighting', '📏 Full body', '🪞 Mirror ok'].map(t => (
                  <span key={t} style={{ fontSize: 10, color: 'var(--muted)', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 10 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} />

        {step >= 2 && (
          <div className="au" style={{ marginBottom: 22 }}>
            <div className="div" />
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Occasion</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {OCCASIONS.map(o => (
                <button key={o} className={`chip ${occasion === o ? 'on' : ''}`}
                  onClick={() => { setOccasion(o); setStep(s => Math.max(s, 3)) }}>{o}</button>
              ))}
            </div>
          </div>
        )}

        {step >= 3 && (
          <div className="au">
            <div className="div" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Style Vibe</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {VIBES.map(v => (
                    <button key={v} className={`chip ${vibe === v ? 'on' : ''}`} style={{ fontSize: 11, padding: '6px 11px' }}
                      onClick={() => setVibe(v === vibe ? '' : v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Gender</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {GENDERS.map(g => (
                    <button key={g} className={`chip ${gender === g ? 'on' : ''}`} style={{ fontSize: 11, padding: '6px 11px', textAlign: 'left' }}
                      onClick={() => setGender(g)}>{g}</button>
                  ))}
                </div>
              </div>
            </div>

            {err && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 14, padding: '10px 14px', background: 'rgba(184,84,80,.08)', border: '1px solid rgba(184,84,80,.2)', borderRadius: 4, lineHeight: 1.5 }}>{err}</div>
            )}

            {loading ? (
              <div className="card" style={{ textAlign: 'center', padding: 28 }}>
                <div style={{ marginBottom: 12 }}><Spinner size={28} color="var(--gold)" /></div>
                <div className="pulse" style={{ fontSize: 13, color: 'var(--muted)' }}>{progress}</div>
              </div>
            ) : (
              <button className="btn" onClick={analyze} style={{ width: '100%', fontSize: 14 }}>✦ Analyze My Outfit</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────
function ResultsScreen({ data, onSave, onNew }) {
  const { result, imageUrl, occasion } = data
  const { t, lang } = useContext(LangContext)
  const langInstruction = T[lang]?.langInstruction || T.en.langInstruction
  const [tab, setTab] = useState('overview')
  const [saved, setSaved] = useState(false)
  const pCol = { high: 'var(--red)', medium: 'var(--gold)', low: 'var(--green)' }
  const pLabel = { high: 'Fix First', medium: 'Next Step', low: 'Polish' }

  return (
    <div className="pb au" style={{ paddingTop: 60 }}>
      <div className="mx px">
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-start' }}>
          <div style={{ width: 100, height: 130, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
            <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>{occasion}</div>
            <h2 className="serif" style={{ fontSize: 20, lineHeight: 1.2, marginBottom: 10 }}>{result.headline}</h2>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {result.trend_tags?.map(t => (
                <span key={t} style={{ fontSize: 10, color: 'var(--gold)', background: 'rgba(200,169,110,.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(200,169,110,.2)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="card-g" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <ScoreRing score={result.overall_score} size={105} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Style Archetype</div>
            <div className="serif italic" style={{ fontSize: 19, color: 'var(--gold)', marginBottom: 10 }}>{result.style_archetype}</div>
            <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.65 }}>{result.stylist_note}</p>
          </div>
        </div>

        {result.color_palette?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Detected palette:</span>
            {result.color_palette.map((c, i) => (
              <div key={i} title={c} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: '2px solid var(--border)' }} />
            ))}
          </div>
        )}

        <div className="tabs" style={{ marginBottom: 20 }}>
          {[['overview', t.overview], ['improve', t.improve], ['chat', t.askStylist]].map(([id, label]) => (
            <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="as">
            {result.categories?.map(cat => (
              <div key={cat.name} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}><span>{CAT_ICONS[cat.name]}</span><span>{cat.name}</span></div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(cat.score) }}>{cat.score.toFixed(1)}</span>
                </div>
                <ProgBar value={cat.score} />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{cat.note}</div>
              </div>
            ))}
            <div className="div" />
            <div className="card" style={{ borderColor: 'rgba(107,158,120,.22)', background: 'rgba(107,158,120,.05)', marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--green)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>{t.whatWorks}</div>
              {result.what_works?.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                  <span style={{ color: 'var(--green)' }}>→</span>
                  <span style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.5 }}>{w}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ borderColor: 'rgba(200,169,110,.25)', background: 'rgba(200,169,110,.04)' }}>
              <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>{t.powerMove}</div>
              <p style={{ fontSize: 14, color: 'var(--cream)', lineHeight: 1.7 }}>{result.upgrade_tip}</p>
            </div>
          </div>
        )}

        {tab === 'improve' && (
          <div className="as">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6 }}>{t.improvementsIntro}</p>
            {result.improvements?.map((imp, i) => (
              <div key={i} className={`card p${imp.priority[0]}`} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{imp.item}</div>
                  <span style={{ fontSize: 9, padding: '3px 8px', background: `${pCol[imp.priority]}18`, color: pCol[imp.priority], borderRadius: 10, whiteSpace: 'nowrap', fontWeight: 700, border: `1px solid ${pCol[imp.priority]}35`, flexShrink: 0 }}>{pLabel[imp.priority]}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>→ {imp.action}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'chat' && <ChatPanel result={result} occasion={occasion} langInstruction={langInstruction} />}

        <div className="div" />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-o" onClick={() => { onSave(data); setSaved(true) }} style={{ flex: 1, fontSize: 12 }}>{saved ? t.saved : t.saveLook}</button>
          <button className="btn" onClick={onNew} style={{ flex: 1, fontSize: 12 }}>{t.rateAnother}</button>
        </div>
      </div>
    </div>
  )
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ result, occasion, langInstruction }) {
  const { t } = useContext(LangContext)
  const [msgs, setMsgs] = useState([{ role: 'stylist', text: `${result.overall_score.toFixed(1)}/10. ${result.headline}` }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef()
  const suggested = ['What shoes would work better?', 'How do I restyle this for another occasion?', 'What color should I add?', 'What must I change first?']

  const send = async text => {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    const newMsgs = [...msgs, { role: 'user', text: q }]
    setMsgs(newMsgs)
    setLoading(true)
    try {
      const ctx = `Score: ${result.overall_score}/10, Archetype: ${result.style_archetype}, Occasion: ${occasion}
Headline: ${result.headline}
Stylist note: ${result.stylist_note}
What works: ${result.what_works?.join(', ')}
Improvements: ${result.improvements?.map(i => i.item + ': ' + i.action).join('; ')}
Categories: ${result.categories?.map(c => c.name + ' ' + c.score + '/10 — ' + c.note).join('; ')}
Upgrade tip: ${result.upgrade_tip}
${langInstruction}`
      const reply = await apiChat(q, ctx, msgs)
      setMsgs(m => [...m, { role: 'stylist', text: reply }])
    } catch {
      setMsgs(m => [...m, { role: 'stylist', text: 'Connection issue. Try again.' }])
    }
    setLoading(false)
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="as">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {suggested.map(q => <button key={q} className="chip" style={{ fontSize: 11 }} onClick={() => send(q)}>{q}</button>)}
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {m.role === 'stylist' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✦</div>}
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 4, fontSize: 13, lineHeight: 1.65, background: m.role === 'stylist' ? 'var(--card)' : 'rgba(200,169,110,.07)', marginLeft: m.role === 'user' ? 38 : 0, border: '1px solid var(--border)' }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✦</div>
            <div className="pulse" style={{ fontSize: 13, color: 'var(--muted)' }}>{t.thinking}</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="inp" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && send()} placeholder={t.chatPlaceholder} style={{ flex: 1 }} />
        <button className="btn" onClick={() => send()} disabled={loading} style={{ padding: '12px 18px', fontSize: 13 }}>→</button>
      </div>
    </div>
  )
}

// ─── WARDROBE SCREEN ──────────────────────────────────────────────────────────
function WardrobeScreen({ history, onView }) {
  const [sort, setSort] = useState('date')
  const sorted = [...history].sort((a, b) => sort === 'score' ? b.result.overall_score - a.result.overall_score : b.timestamp - a.timestamp)
  const avg = history.length ? (history.reduce((s, h) => s + h.result.overall_score, 0) / history.length).toFixed(1) : null
  const best = history.length ? history.reduce((b, h) => h.result.overall_score > b.result.overall_score ? h : b) : null

  return (
    <div className="pb" style={{ paddingTop: 60 }}>
      <div className="mx px">
        <h2 className="serif" style={{ fontSize: 30, marginBottom: 4 }}>My <span className="italic" style={{ color: 'var(--gold)' }}>Wardrobe</span></h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>Saved looks & style history</p>

        {history.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              {[{ icon: '📸', label: 'Outfits', value: history.length }, { icon: '⭐', label: 'Avg Score', value: avg }, { icon: '🏆', label: 'Best', value: best?.result.overall_score.toFixed(1) || '—' }].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: 14 }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sort:</span>
              {[['date', 'Latest'], ['score', 'Top Score']].map(([id, label]) => (
                <button key={id} className={`chip ${sort === id ? 'on' : ''}`} style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setSort(id)}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sorted.map((item, i) => (
                <div key={i} className="hcard" onClick={() => onView(item)}>
                  <div style={{ width: 62, height: 78, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="serif italic" style={{ fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gold)' }}>{item.result.style_archetype}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{item.occasion}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {item.result.trend_tags?.slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize: 9, color: 'var(--muted)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 8 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: scoreColor(item.result.overall_score), lineHeight: 1 }}>{item.result.overall_score.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: 'var(--muted)' }}>/ 10</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '70px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>👗</div>
            <div className="serif" style={{ fontSize: 20, marginBottom: 8 }}>No saved looks yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Rate an outfit and save it<br />to build your wardrobe</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EXPLORE SCREEN ───────────────────────────────────────────────────────────
function ExploreScreen() {
  const { t, lang } = useContext(LangContext)
  const langInstruction = T[lang]?.langInstruction || T.en.langInstruction
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const topics = [
    { icon: '👔', q: 'What are the key rules of business casual dressing?' },
    { icon: '🎨', q: 'Which color combinations always look stylish?' },
    { icon: '📏', q: 'How can clothing make you look taller and slimmer?' },
    { icon: '🔥', q: 'What are the biggest fashion trends right now in 2025?' },
    { icon: '🧳', q: 'How to build a minimalist travel capsule wardrobe?' },
    { icon: '💎', q: 'How to accessorize an outfit simply but effectively?' },
    { icon: '🌙', q: 'How to dress up a casual outfit for a night out?' },
    { icon: '💼', q: 'What wardrobe essentials does everyone need?' },
  ]

  const ask = async question => {
    const txt = (question || q).trim()
    if (!txt) return
    setLoading(true); setAnswer(null)
    try {
      const res = await apiExplore(txt + '\n\n' + langInstruction)
      setAnswer({ q: txt, a: res })
    } catch { setAnswer({ q: txt, a: 'Could not load response. Please try again.' }) }
    setLoading(false)
  }

  return (
    <div className="pb" style={{ paddingTop: 60 }}>
      <div className="mx px">
        <h2 className="serif" style={{ fontSize: 30, marginBottom: 4 }}>Style <span className="italic" style={{ color: 'var(--gold)' }}>Explore</span></h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>Ask your AI stylist anything</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input className="inp" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder={t.askPlaceholder} />
          <button className="btn" onClick={() => ask()} style={{ padding: '12px 18px', fontSize: 13, flexShrink: 0 }}>{t.ask}</button>
        </div>
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: 36, marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}><Spinner size={24} color="var(--gold)" /></div>
            <div className="pulse" style={{ fontSize: 13, color: 'var(--muted)' }}>Your stylist is thinking...</div>
          </div>
        )}
        {answer && !loading && (
          <div className="card-g au" style={{ marginBottom: 24, borderLeft: '2px solid var(--gold)' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
              <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>VOGUE AI Stylist</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontStyle: 'italic' }}>"{answer.q}"</div>
            <div style={{ fontSize: 14, color: 'var(--cream)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{answer.a}</div>
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, fontWeight: 600 }}>Quick Topics</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topics.map(t => (
            <button key={t.q} onClick={() => ask(t.q)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 5, padding: '13px 16px', color: 'var(--cream)', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontFamily: "'Jost',sans-serif", display: 'flex', gap: 12, alignItems: 'center', transition: 'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(200,169,110,.28)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{t.q}</span>
              <span style={{ color: 'var(--gold)', flexShrink: 0 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen({ history, profile, onSaveProfile }) {
  const [edit, setEdit] = useState(false)
  const [local, setLocal] = useState(profile)
  const avg = history.length ? (history.reduce((s, h) => s + h.result.overall_score, 0) / history.length).toFixed(1) : '—'
  const best = history.length ? history.reduce((b, h) => h.result.overall_score > b.result.overall_score ? h : b, history[0]) : null
  const topArch = (() => { const a = history.map(h => h.result.style_archetype).filter(Boolean).reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc }, {}); return Object.entries(a).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Style Explorer' })()
  const topOcc = (() => { const a = history.reduce((acc, h) => { acc[h.occasion] = (acc[h.occasion] || 0) + 1; return acc }, {}); return Object.entries(a).sort((a, b) => b[1] - a[1])[0]?.[0] || '—' })()
  const badge = history.length >= 20 ? 'Style Icon' : history.length >= 10 ? 'Fashion Expert' : history.length >= 5 ? 'Rising Stylist' : history.length >= 1 ? 'Style Curious' : 'New'
  const save = () => { onSaveProfile(local); setEdit(false) }

  return (
    <div className="pb" style={{ paddingTop: 60 }}>
      <div className="mx px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h2 className="serif" style={{ fontSize: 30 }}>Style <span className="italic" style={{ color: 'var(--gold)' }}>DNA</span></h2>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Your fashion identity</p>
          </div>
          <button className="btn-o" style={{ fontSize: 12 }} onClick={() => edit ? save() : setEdit(true)}>{edit ? 'Save' : 'Edit'}</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),#B85450)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '2px solid var(--border)' }}>✦</div>
          <div>
            {edit ? (
              <input value={local.name || ''} onChange={e => setLocal(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className="inp" style={{ marginBottom: 8, fontSize: 15 }} />
            ) : (
              <div className="serif" style={{ fontSize: 20, marginBottom: 6 }}>{local.name || 'Style Explorer'}</div>
            )}
            <div className="badge" style={{ color: 'var(--gold)', background: 'rgba(200,169,110,.1)', border: '1px solid rgba(200,169,110,.2)' }}>🏆 {badge}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 24 }}>
          {[{ icon: '📸', label: 'Outfits Rated', value: history.length }, { icon: '⭐', label: 'Avg Score', value: avg }, { icon: '🎭', label: 'Top Archetype', value: topArch }, { icon: '📅', label: 'Fav Occasion', value: topOcc }].map(s => (
            <div key={s.label} className="card">
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div className="serif" style={{ fontSize: String(s.value).length > 8 ? 13 : 20, fontWeight: 700, color: 'var(--gold)', lineHeight: 1.2, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Your Style Preferences</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Style Vibe</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {VIBES.map(v => (
              <button key={v} className={`chip ${local.styleVibe === v ? 'on' : ''}`} style={{ fontSize: 11, padding: '5px 11px' }} onClick={() => edit && setLocal(p => ({ ...p, styleVibe: v }))}>{v}</button>
            ))}
          </div>
          {edit && <button className="btn" onClick={save} style={{ width: '100%', marginTop: 16, fontSize: 13 }}>Save Profile</button>}
        </div>

        {history.length > 0 && (
          <div className="card-g" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>✦ Your Style Report</div>
            <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.8 }}>
              You've rated <strong>{history.length}</strong> outfit{history.length !== 1 ? 's' : ''} with an average of <strong style={{ color: scoreColor(parseFloat(avg)) }}>{avg}/10</strong>.
              Your style leans <strong>{topArch}</strong>, mostly dressing for <strong>{topOcc}</strong>.
              {parseFloat(avg) >= 7.5 ? ' You\'re putting together consistently strong looks.' : ' Keep experimenting — your eye for style is developing.'}
            </p>
          </div>
        )}

        {best && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>🏆 Your Best Look</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 68, height: 86, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                <img src={best.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div className="serif italic" style={{ fontSize: 17, color: 'var(--gold)', marginBottom: 4 }}>{best.result.style_archetype}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{best.occasion}</div>
                <div className="serif" style={{ fontSize: 28, fontWeight: 700, color: scoreColor(best.result.overall_score) }}>
                  {best.result.overall_score.toFixed(1)}<span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400, fontFamily: 'Jost' }}>/10</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sign-in section — uncomment when ready ───────────────────────────
        <div className="div" />
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Sign in to sync your wardrobe across all devices
          </div>
          <button className="btn" style={{ width: '100%', fontSize: 13 }}>
            Continue with Google
          </button>
        </div>
        ── End sign-in section ─────────────────────────────────────────────── */}

      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState('loading')
  const [tab, setTab] = useState('rate')
  const [currentResult, setCurrentResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [history, setHistory] = useState([])
  const [profile, setProfile] = useState({ name: '', styleVibe: '' })
  const [lang, setLang] = useState('en')
  const t = T[lang] || T.en

  useEffect(() => {
    (async () => {
      try {
        const [h, p, l] = await Promise.all([storageGet('vogue_history'), storageGet('vogue_profile'), storageGet('vogue_lang')])
        if (h) setHistory(h)
        if (p) setProfile(p)
        if (l) setLang(l)
      } catch {}
      setAppState('welcome')
    })()
  }, [])

  const handleLang = async code => {
    setLang(code)
    await storageSet('vogue_lang', code)
    // Apply RTL direction for Arabic and Persian
    document.documentElement.dir = (code === 'ar' || code === 'fa') ? 'rtl' : 'ltr'
  }

  const handleResult = data => { setCurrentResult(data); setShowResult(true) }
  const handleSaveLook = async data => { const n = [data, ...history].slice(0, 50); setHistory(n); await storageSet('vogue_history', n) }
  const handleSaveProfile = async p => { setProfile(p); await storageSet('vogue_profile', p) }
  const handleNewOutfit = () => { setShowResult(false); setCurrentResult(null) }
  const handleViewLook = look => { setCurrentResult(look); setShowResult(true) }

  if (appState === 'loading') {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <style>{CSS}</style>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse" style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading VOGUE AI...</div>
        </div>
      </div>
    )
  }

  return (
    <LangContext.Provider value={{ lang, t, setLang: handleLang }}>
      <div className="app">
        <style>{CSS}</style>
        {appState === 'welcome' && <WelcomeScreen onStart={() => setAppState('main')} />}
        {appState === 'main' && (
          <>
            {showResult && currentResult ? (
              <><TopBar showBack onBack={handleNewOutfit} /><ResultsScreen data={currentResult} onSave={handleSaveLook} onNew={handleNewOutfit} /></>
            ) : (
              <>
                <TopBar />
                {tab === 'rate' && <RateScreen onResult={handleResult} savedVibe={profile.styleVibe} />}
                {tab === 'wardrobe' && <WardrobeScreen history={history} onView={handleViewLook} />}
                {tab === 'explore' && <ExploreScreen />}
                {tab === 'profile' && <ProfileScreen history={history} profile={profile} onSaveProfile={handleSaveProfile} />}
                <BottomNav active={tab} onChange={setTab} />
              </>
            )}
          </>
        )}
      </div>
    </LangContext.Provider>
  )
}
