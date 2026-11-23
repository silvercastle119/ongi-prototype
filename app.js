/* ONGI – AI 화분 연동 앱 프로토타입 */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = (f) => `assets/${f}`;
  const STORE_KEY = 'ongi-proto-v1';
  const DEFAULT_PLANT_NAME = '당신의 식물'; // 이름을 짓지 않았을 때
  const START_DATE = '2026-10-17';
  const UNDERSTAND_GOAL = 3; // 새 식물이 찾아오기까지 필요한 문답 수

  /* ---------------- 데이터 ---------------- */
  const SURVEY = [
    { title: '식물을 키우는 이유가\n무엇인가요?', hint: '여러 개 골라도 괜찮아요', multi: true,
      options: ['마음이 편안해져서', '공간을 가꾸고 싶어서', '선물로 받아서', '무언가를 돌보는 게 좋아서', '기타'] },
    { title: '식물과 함께한 지\n얼마나 됐나요?', hint: '하나만 골라주세요', multi: false,
      options: ['이번이 처음이에요', '1년이 안 됐어요', '1~3년 정도요', '3년이 넘었어요'] },
    { title: '하루 중 가장 여유로운\n시간은 언제인가요?', hint: '이 시간에 오늘의 질문을 보내드릴게요', multi: false,
      options: ['아침', '점심', '저녁', '잠들기 전'] },
  ];
  const PROGRESS_W = [96, 174, 252];

  // 홈 정원 일러스트: 몬스테라는 Figma 그림(줄기+잎), 나머지는 같은 스타일로 그린 plant-<id>.svg (tools/gen_plants.py)
  const plantArt = (id) => (id === 'monstera' ? null : `plant-${id}.svg`);
  const plantPhoto = (p) => (p.img ? A(p.img) : A(plantArt(p.id)));
  const PLANTS = [
    { id: 'monstera', name: '몬스테라', desc: '밝은 그늘에서 잘 자라요', img: 'plant-monstera.png' },
    { id: 'stuckyi', name: '스투키', desc: '물을 자주 주지 않아도 돼요', img: 'plant-stuckyi.png' },
    { id: 'zz', name: '금전수', desc: '처음 키우는 분께 좋아요', img: 'plant-zz.png' },
    { id: 'palm', name: '테이블야자', desc: '그늘진 실내에서도 괜찮아요', img: 'plant-palm.png' },
    { id: 'olive', name: '올리브나무', desc: '햇빛을 많이 좋아해요', img: 'plant-olive.png' },
    { id: 'cactus', name: '선인장', desc: '물을 아주 가끔 줘도 괜찮아요', img: 'plant-cactus-photo.svg' },
  ];

  // 마음 캐릭터: Figma 인스턴스의 내부 inset(%) 그대로 [top, right, bottom, left]
  const MOODS = {
    calm: { label: '평온', src: 'mood-calm.svg', box: [0, 0, 0, 0], img: [0, 0, -11.67, 0] },
    surprise: { label: '놀람', src: 'mood-surprise.svg', box: [11.13, 9.91, 10.21, 9.91], img: [0, 0, -9.32, 0] },
    worry: { label: '고민', src: 'mood-worry.svg', box: [9.09, 14.44, 17.25, 19.39], img: [0, -20.15, -27.15, -20.15] },
    angry: { label: '화남', src: 'mood-angry.svg', box: [5.66, 19.17, 7.5, 19.17], img: [0, -21.62, -23.03, -21.62] },
    sad: { label: '슬픔', src: 'mood-sad.svg', box: [11.36, 18.36, 11.94, 19.13], img: [-8.69, -21.33, -26.08, -21.33] },
  };
  const MOOD_ORDER = ['calm', 'surprise', 'worry', 'angry', 'sad'];

  const QUESTIONS = [
    { q: '오늘 나의\n어처구니 없는 실수는?', f: '그 실수를 하게 됐을 때 기분이 어땠나요?' },
    { q: '오늘 당신을 가장\n힘들게 한 것은 무엇인가요?', f: '그때 어떤 말이 듣고 싶었나요?' },
    { q: '요즘 나를\n웃게 하는 작은 순간은?', f: '그 순간을 더 자주 만들 수 있을까요?' },
    { q: '오늘 나에게\n해주고 싶은 말은?', f: '그 말을 들으면 어떤 기분이 들 것 같나요?' },
    { q: '지금 가장\n쉬고 싶은 곳은 어디인가요?', f: '그곳에 누구와 함께 있고 싶나요?' },
  ];

  const SEED_RECORDS = {
    1: ['calm', '오늘 가장 오래 바라본 것은?', '창밖 은행나무. 벌써 노랗게 물들기 시작했어요.'],
    2: ['surprise', '오늘 예상하지 못했던 일은?', '오랜만에 친구한테 연락이 왔어요.'],
    3: ['calm', '지금 떠오르는 냄새가 있나요?', '아침에 내린 커피 향.'],
    5: ['sad', '오늘 아쉬웠던 순간은?', '약속이 갑자기 취소됐어요.'],
    6: ['calm', '오늘 나를 웃게 한 것은?', '점심에 먹은 김치찌개가 정말 맛있었어요.'],
    8: ['worry', '요즘 자꾸 생각나는 고민은?', '이직을 해야 할지 계속 고민돼요.'],
    9: ['calm', '오늘 고마웠던 사람은?', '퇴근길에 우산 씌워준 동료.'],
    12: ['angry', '오늘 나를 화나게 한 일은?', '지하철에서 누가 계속 밀었어요.'],
    13: ['calm', '오늘 잘한 일 하나는?', '미뤄둔 방 청소를 끝냈어요.'],
    14: ['worry', '내일 가장 신경 쓰이는 일은?', '발표 준비가 아직 덜 됐어요.'],
    15: ['calm', '오늘 나에게 해준 작은 선물은?', '좋아하는 빵집에 들렀어요.'],
    16: ['sad', '오늘 듣고 싶었던 말은?', '수고했다는 말 한마디.'],
  };

  const CARE_XP = 30; // 실제 화분 돌봄 퀘스트는 모두 경험치
  const QUESTS = {
    thirst: { title: '실제 화분에 물 주기', color: '#6fa2da', icon: 'ic-drop-12.svg', item: 'water', reward: '물방울 +1, 30 XP', hint: '실제 화분에 물을 주면 자동으로 완료돼요', got: '물방울을 받았어요', did: (n) => `오늘 ${n}에게 물을 줬어요`, care: 'water' },
    sun: { title: '햇빛 쬐어주기', color: '#e9b949', icon: 'ic-sun-12.svg', item: 'sun', reward: '햇빛 +1, 30 XP', hint: '화분을 햇빛이 드는 곳에 두면 자동으로 완료돼요', got: '햇빛을 받았어요', did: (n) => `${josa(n, '이', '가')} 햇빛을 듬뿍 쬐었어요`, care: 'sun' },
    climate: { title: '온습도 맞춰주기', color: '#7fbfa6', icon: 'ic-heart-16.svg', item: 'heart', reward: '마음 +1, 30 XP', hint: '화분 주변 온도와 습도를 맞춰주면 자동으로 완료돼요', got: '마음을 받았어요', did: (n) => `${n}의 온도와 습도를 맞춰줬어요`, care: 'climate' },
    nutrient: { title: '영양제 넣어주기', color: '#b994d6', icon: 'ic-heart-16.svg', item: 'heart', reward: '마음 +1, 30 XP', hint: '화분에 영양제를 꽂아주면 자동으로 완료돼요', got: '마음을 받았어요', did: (n) => `${n}에게 영양제를 넣어줬어요`, care: 'nutrient' },
    air: { title: '창문 열어 환기하기', color: '#8fb3d9', icon: 'ic-heart-16.svg', item: 'heart', reward: '마음 +1, 30 XP', hint: '창문을 열어 바람이 통하면 자동으로 완료돼요', got: '마음을 받았어요', did: (n) => `${n}에게 시원한 바람을 쐬어줬어요`, care: 'air' },
    diary: { title: '오늘의 질문에 답하기', color: '#d987ad', icon: 'ic-point.svg', reward: '50P' },
  };
  const ITEM_ICON = { water: ['item-drop-56.svg', ''], sun: ['item-sun-24.svg', ' sun'], heart: ['item-heart-24.svg', ' heart'] };

  const CARE_TYPES = {
    water: { label: '물주기', icon: 'ic-drop-16.svg' },
    leaf: { label: '잎닦기', icon: 'ic-heart-16.svg' },
    sun: { label: '햇빛 쬐기', icon: 'ic-sun.svg' },
    climate: { label: '온습도 맞추기', icon: 'menu-pot.svg' },
    nutrient: { label: '영양제', icon: 'menu-pot.svg' },
    air: { label: '환기', icon: 'menu-pot.svg' },
  };

  // pos: [left, top, 상자 크기] – 그림의 실제 높이가 모두 약 30px(캐릭터의 2/3)이 되도록 상자 크기를 맞춤
  const GOODS = [
    { id: 'fence', name: '나무 울타리', price: 300, cat: 'garden', img: 'shop-fence.svg', desc: '정원 뒤편을 아늑하게 감싸줘요', pos: [42, 416, 42] },
    { id: 'tulip', name: '튤립 화단', price: 600, cat: 'garden', img: 'shop-tulip.svg', desc: '알록달록한 튤립이 피어나요', pos: [284, 413, 41] },
    { id: 'snail', name: '달팽이 친구', price: 450, cat: 'char', img: 'shop-snail.svg', desc: '새 식물 캐릭터의 느긋한 친구예요', pos: [236, 457, 57] },
    { id: 'mushroom', name: '버섯 등불', price: 500, cat: 'garden', img: 'shop-mushroom.svg', desc: '밤이 되면 은은하게 빛나요', pos: [90, 457, 43] },
    { id: 'pebble', name: '조약돌 길', price: 200, cat: 'garden', img: 'shop-pebble.svg', desc: '캐릭터가 걷는 길을 만들어요', pos: [162, 477, 49] },
    { id: 'can', name: '작은 물뿌리개', price: 350, cat: 'pot', img: 'shop-can.svg', desc: '화분 옆에 두는 작은 소품이에요', pos: [6, 453, 53] },
  ];

  const LEVELS = [
    { name: '씨앗', scale: 0.6 },
    { name: '새싹', scale: 0.76 },
    { name: '어린 잎', scale: 0.9 },
    { name: '꽃봉오리', scale: 1.04 },
  ];
  const XP_PER_LEVEL = 100;

  /* 리플 인터랙션 – 움직임 5가지는 같고, 레벨마다 의미와 빛만 달라진다 */
  const PATTERNS = { 1: '잔잔한 낮은 물결', 2: '중심에서 바깥으로 퍼지는 물결', 3: '불규칙한 다중 움직임', 4: '안쪽에서 바깥쪽으로 천천히 확장', 5: '회전하는 물결' };
  const MEANING = {
    1: { 1: '갈증', 2: '햇빛 부족', 3: '온도와 습도 불편', 4: '영양 부족', 5: '환기 필요' },
    2: { 1: '감사', 2: '안도', 3: '신남', 4: '만족', 5: '애정' },
    3: { 1: '지금 상태를 존중함', 2: '사용자를 진정시키려 함', 3: '기쁨을 함께 나눔', 5: '사용자를 응원함' },
  };
  const LEVEL_INFO = { 1: ['식물의 상태를 알리는 단계', '백색광'], 2: ['상태에 감정을 더하는 단계', '은은한 색조의 빛'], 3: ['사용자에게 마음을 전하는 단계', '따뜻한 노란빛'] };
  const LIGHT = { 1: [255, 255, 255], 2: [255, 241, 208], 3: [255, 196, 66] }; // 백색 → 은은한 노란빛 → 따뜻한 노란빛
  const NEED_ORDER = ['thirst', 'sun', 'climate', 'nutrient', 'air'];
  const NEED_PATTERN = { thirst: 1, sun: 2, climate: 3, nutrient: 4, air: 5 };
  const L3_STAGE = 2; // 캐릭터가 '어린 잎'(성장 3단계)으로 자라면 Level 3
  const THEMES = {
    morning: { label: '아침', clock: '9:41', light: 1, dim: 1 },
    evening: { label: '저녁', clock: '18:40', light: 1, dim: 0.93 },
    night: { label: '밤', clock: '22:10', light: 1, dim: 0.42 },
  };
  // 레벨별 의미 → 캐릭터 반응 (표정 · 몸짓)
  const REACT = {
    '1-1': { face: 'thirsty', act: 'bounce' }, '1-2': { face: 'droopy', act: 'slow' }, '1-3': { face: 'uneasy', act: 'restless' },
    '1-4': { face: 'tired', act: 'slow' }, '1-5': { face: 'uneasy', act: 'dizzy' },
    '2-1': { face: 'happy', act: 'skip' }, '2-2': { face: 'relieved', act: 'sigh' }, '2-3': { face: 'excited', act: 'party' },
    '2-4': { face: 'relieved', act: 'stretch' }, '2-5': { face: 'love', act: 'orbit' },
    '3-1': { face: 'calm', act: 'still' }, '3-2': { face: 'calm', act: 'breathe' }, '3-3': { face: 'excited', act: 'party' }, '3-5': { face: 'happy', act: 'cheer' },
  };
  const INK = '#1B1D1B';
  const EYES_OPEN = (px = 0, py = 0, r = 3.1) => `<ellipse cx="23" cy="48" rx="5.6" ry="6.4" fill="#FFFFFC"/><ellipse cx="37" cy="48" rx="5.6" ry="6.4" fill="#FFFFFC"/><circle cx="${24.3 + px}" cy="${49.3 + py}" r="${r}" fill="${INK}"/><circle cx="${38.3 + px}" cy="${49.3 + py}" r="${r}" fill="${INK}"/>`;
  const S2 = `stroke="${INK}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const FACES = {
    default: EYES_OPEN() + `<path d="M27.5 59C29 60.3 31 60.3 32.5 59" ${S2}/>`,
    thirsty: EYES_OPEN(-0.3, -2.4, 2.6) + `<ellipse cx="30" cy="60" rx="2.4" ry="2" fill="${INK}"/><ellipse cx="30.7" cy="61.4" rx="1.4" ry="0.9" fill="#E77B7B"/><path d="M48 33C46 36.4 46 38.6 48 38.6C50 38.6 50 36.4 48 33Z" fill="#8EC3EF"/>`,
    droopy: EYES_OPEN(-0.3, 1.6, 2.8) + `<path d="M27.5 60.6C29 59.2 31 59.2 32.5 60.6" ${S2}/>`,
    uneasy: `<path d="M19.8 45.4L25.6 48L19.8 50.6M40.2 45.4L34.4 48L40.2 50.6" ${S2}/><path d="M25.6 60.2q1.1-1.4 2.2 0t2.2 0t2.2 0t2.2 0" ${S2}/>`,
    tired: `<path d="M18.6 47.6h9M32.4 47.6h9" ${S2}/><path d="M21 48a2.8 2.8 0 0 0 5.6 0ZM35 48a2.8 2.8 0 0 0 5.6 0Z" fill="${INK}"/><path d="M28 60.2h4" ${S2}/>`,
    happy: `<path d="M19.4 50Q23 44.8 26.6 50M33.4 50Q37 44.8 40.6 50" ${S2} stroke-width="2.1"/><path d="M26.4 57.6Q30 63.6 33.6 57.6Z" fill="${INK}"/><ellipse cx="30" cy="60.4" rx="1.6" ry="0.9" fill="#E77B7B"/>`,
    excited: `<path d="M19.4 50Q23 44.6 26.6 50M33.4 50Q37 44.6 40.6 50" ${S2} stroke-width="2.2"/><path d="M25.4 57.2Q30 65.6 34.6 57.2Z" fill="${INK}"/><ellipse cx="30" cy="61.2" rx="2.1" ry="1.1" fill="#E77B7B"/>`,
    relieved: `<path d="M19.4 47.6Q23 51.6 26.6 47.6M33.4 47.6Q37 51.6 40.6 47.6" ${S2}/><path d="M27 58.8Q30 61.8 33 58.8" ${S2}/>`,
    calm: `<path d="M19.6 48.4Q23 51 26.4 48.4M33.6 48.4Q37 51 40.4 48.4" ${S2}/><path d="M28 59.2Q30 60.6 32 59.2" ${S2}/>`,
    love: `<path d="M23 52.4C17.4 48.4 19.2 43.4 23 46C26.8 43.4 28.6 48.4 23 52.4ZM37 52.4C31.4 48.4 33.2 43.4 37 46C40.8 43.4 42.6 48.4 37 52.4Z" fill="#E5587A"/><path d="M26.6 57.8Q30 62.8 33.4 57.8Z" fill="${INK}"/>`,
  };
  const CHEEKS = '<circle cx="17" cy="56" r="4" fill="#F0A48C"/><circle cx="43" cy="56" r="4" fill="#F0A48C"/>';
  // 캐릭터 5종 (Figma '마음 캐릭터') – 표정은 공통 얼굴 템플릿을 눈 위치에 맞춰 덧씌운다
  const CHAR_K = 14 / 8.8; // 마음 캐릭터 눈 간격 8.8 → 얼굴 템플릿 눈 간격 14
  const CHARS = {
    calm: { name: '새싹이', label: '평온', icon: 'mood-calm.svg', layered: true },
    surprise: { name: '꽃잎이', label: '놀람', icon: 'mood-surprise.svg', body: 'body-surprise.svg', vb: [35.2796, 37.8373], eye: [17.64, 15.84] },
    worry: { name: '몽글이', label: '고민', icon: 'mood-worry.svg', body: 'body-worry.svg', vb: [40.8473, 41.2115], eye: [18.33, 17.65] },
    angry: { name: '뾰족이', label: '화남', icon: 'mood-angry.svg', body: 'body-angry.svg', vb: [38.8667, 47.0115], eye: [19.43, 23.18] },
    sad: { name: '방울이', label: '슬픔', icon: 'mood-sad.svg', body: 'body-sad.svg', vb: [39.2392, 45.4815], eye: [19.45, 23.12] },
  };
  const CHAR_ORDER = ['calm', 'surprise', 'worry', 'angry', 'sad'];
  const CHAR_COLOR = { calm: '#9cc46f', surprise: '#e9c45c', worry: '#a7aee0', angry: '#e89a8c', sad: '#8fbce6' };
  function faceSVG(type, kind) {
    return `<svg class="c-face" viewBox="0 0 60 78" width="60" height="78" aria-hidden="true">${CHARS[type].layered ? CHEEKS : ''}${FACES[kind] || FACES.default}</svg>`;
  }
  // 60×84 상자 기준 몸통 (발·그림자 제외)
  function bodyHTML(type, kind = 'default') {
    const c = CHARS[type] || CHARS.calm;
    if (c.layered) {
      return `<img class="c-sprout" src="${A('char-sprout.svg')}" alt=""><img class="c-seed" src="${A('char-seed.svg')}" alt="">${faceSVG(type, kind)}`;
    }
    const w = c.vb[0] * CHAR_K; const h = c.vb[1] * CHAR_K;
    const l = 30 - c.eye[0] * CHAR_K; const t = 48 - c.eye[1] * CHAR_K;
    return `<img class="c-mood" src="${A(c.body)}" alt="" style="left:${l.toFixed(2)}px;top:${t.toFixed(2)}px;width:${w.toFixed(2)}px;height:${h.toFixed(2)}px">${faceSVG(type, kind)}`;
  }
  function charHTML(type, kind = 'default') {
    return `<img class="c-shadow" src="${A('char-shadow.svg')}" alt=""><img class="c-feet" src="${A('char-feet.svg')}" alt=""><div class="c-body">${bodyHTML(type, kind)}</div>`;
  }

  /* ---------------- 유틸 ---------------- */
  const josa = (w, a, b) => {
    const c = w.charCodeAt(w.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return w + b;
    return w + ((c - 0xac00) % 28 ? a : b);
  };
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const dayDiff = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
  const nowTime = () => {
    const d = new Date(); const h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
  };
  const fmt = (n) => n.toLocaleString('ko-KR');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function moodHTML(key, size) {
    const m = MOODS[key];
    const [bt, br, bb, bl] = m.box; const [t, r, b, l] = m.img;
    return `<span class="mood" style="width:${size}px;height:${size}px"><span style="top:${bt}%;right:${br}%;bottom:${bb}%;left:${bl}%"><img src="${A(m.src)}" alt="" style="left:${l}%;top:${t}%;width:${100 - l - r}%;height:${100 - t - b}%"></span></span>`;
  }

  function miniCharHTML(size, box) {
    const k = size / 60;
    return `<span class="mini-char" style="transform:scale(${k});left:${(box - 60 * k) / 2}px;top:${(box - 80 * k) / 2 + 2}px">${charHTML(S.charType)}</span>`;
  }

  /* ---------------- 상태 ---------------- */
  function seedState() {
    const records = {};
    Object.entries(SEED_RECORDS).forEach(([d, [mood, q, a]]) => { records[`2026-10-${String(d).padStart(2, '0')}`] = { mood, q, a }; });
    const careLog = {};
    [1, 4, 7, 10, 13, 16].forEach((d, i) => { careLog[`2026-10-${String(d).padStart(2, '0')}`] = [{ type: 'water', time: `오전 ${8 + (i % 2)}:${String(10 + i * 7).padStart(2, '0')}` }]; });
    [3, 9, 15].forEach((d) => { const k = `2026-10-${String(d).padStart(2, '0')}`; (careLog[k] = careLog[k] || []).push({ type: 'leaf', time: '오후 6:40' }); });
    return {
      onboarded: false,
      screen: 'survey',
      survey: { step: 0, answers: [[], [], []] },
      plant: { species: 'monstera', name: DEFAULT_PLANT_NAME, gender: 'none', date: '2026-08-29', intro: '거실 창가에 사는 첫 식물' },
      nick: '닉네임',
      today: START_DATE,
      points: 1200, water: 3, heart: 1, sun: 0, care: 24,
      records, careLog,
      quests: { thirst: false, sun: false, diary: false }, xpBank: 0,
      diaryCount: 0,
      character: null,
      owned: ['fence'], placed: [], decoPos: {}, charType: 'calm',
      noti: { daily: true, care: true, news: true },
      bond: 0, levelSeen: 1, forcedLevel: null, timeMode: 'auto',
      needs: { climate: false, nutrient: false, air: false },
    };
  }

  let S;
  try { S = JSON.parse(localStorage.getItem(STORE_KEY)) || seedState(); } catch (e) { S = seedState(); }
  S.bond = S.bond || 0; S.levelSeen = S.levelSeen || 1; S.timeMode = S.timeMode || 'auto'; S.forcedLevel = S.forcedLevel || null;
  if (S.quests && 'water' in S.quests) { const o = S.quests; S.quests = { thirst: !!o.water, sun: !!o.sun }; Object.entries(S.needs || {}).forEach(([k, v]) => { if (v) S.quests[k] = false; }); S.quests.diary = !!o.diary; }
  S.xpBank = S.xpBank || 0;
  S.decoPos = S.decoPos || {}; S.charType = S.charType || 'calm'; S.charOverride = S.charOverride || null;
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  /* ---------------- 폰 스케일 ---------------- */
  const phone = $('#phone');
  const wrap = $('#phoneWrap');
  function fit() {
    const narrow = innerWidth <= 760;
    const availW = narrow ? innerWidth - 32 : innerWidth - 268 - 36 - 60;
    const availH = narrow ? innerHeight - 32 : innerHeight - 40;
    const s = Math.min(1, availW / 395, availH / 832);
    phone.style.transform = `scale(${s})`;
    phone.style.transformOrigin = '0 0';
    wrap.style.width = `${375 * s}px`;
    wrap.style.height = `${812 * s}px`;
  }
  addEventListener('resize', fit); fit();

  /* ---------------- 토스트 / 시트 ---------------- */
  let toastTimer;
  function toast(msg, ms = 2200) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
  }
  const sheetLayer = $('#sheetLayer');
  const sheet = $('#sheet');
  let sheetHandlers = {};
  function openSheet(html, handlers = {}) {
    sheet.innerHTML = `<div class="grab"></div>${html}`;
    sheet.scrollTop = 0;
    sheetHandlers = handlers;
    sheetLayer.classList.add('on');
  }
  function closeSheet() { sheetLayer.classList.remove('on'); }
  sheet.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sh]'); if (!b) return;
    const fn = sheetHandlers[b.dataset.sh]; if (fn) fn(b, e);
  });

  /* ---------------- 화면 전환 ---------------- */
  const TAB_SCREENS = ['home', 'calendar', 'shop', 'my'];
  let current = null;
  function go(name, opts = {}) {
    if (name === current && !opts.force) return;
    const prev = current && $(`[data-screen="${current}"]`);
    const next = $(`[data-screen="${name}"]`);
    if (prev) { prev.classList.remove('active', 'play'); }
    current = name; S.screen = name;
    next.classList.add('active');
    closeSheet();
    const isTab = TAB_SCREENS.includes(name);
    $('#gnb').classList.toggle('hidden', !isTab);
    $$('#gnb button').forEach((b) => {
      const on = b.dataset.to === name;
      b.classList.toggle('on', on);
      const img = $('img', b); img.src = on ? img.dataset.on : img.dataset.off;
    });
    setDarkBar(name === 'arrival' || themeNow() === 'night');
    ENTER[name] && ENTER[name](opts);
    save(); renderDev();
  }

  const ENTER = {
    survey: renderSurvey,
    search: () => { $('#plantSearch').value = ''; renderPlantList(''); },
    profile: renderProfile,
    home: renderHome,
    diary: renderDiary,
    calendar: (o) => { calView = monthOf(o.date || S.today); calSel = o.date || S.today; renderCalendar(); },
    arrival: () => {
      const el = $('[data-screen="arrival"]');
      if (!S.character) S.charType = rollCharacter();
      $('#bigChar').innerHTML = `<div class="big-inner">${charHTML(S.charType)}</div>`;
      $('#arrivalSub').textContent = `${josa(S.plant.name, '은', '는')} 지금처럼 돌봐주세요.\n새 식물은 나의 하루를 조금씩 닮아갈 거예요.`;
      void el.offsetWidth; el.classList.add('play');
    },
    shop: renderShop,
    my: renderMy,
  };

  /* ---------------- 01 설문 ---------------- */
  function renderSurvey() {
    const st = S.survey.step; const q = SURVEY[st];
    $('#surveyProgress').style.width = `${PROGRESS_W[st]}px`;
    $('#surveyStep').textContent = `${st + 1}/3`;
    $('#surveyTitle').innerHTML = q.title.replace('\n', '<br>');
    $('#surveyHint').textContent = q.hint;
    const sel = S.survey.answers[st];
    $('#surveyOptions').innerHTML = q.options.map((o, i) => {
      const on = sel.includes(i);
      return `<button class="option${on ? ' on' : ''}" data-i="${i}" style="animation-delay:${i * 40}ms"><img src="${A(on ? 'check-on.svg' : 'check-off.svg')}" alt="">${o}</button>`;
    }).join('');
  }
  $('#surveyOptions').addEventListener('click', (e) => {
    const b = e.target.closest('.option'); if (!b) return;
    const st = S.survey.step; const i = +b.dataset.i; const sel = S.survey.answers[st];
    if (SURVEY[st].multi) { const k = sel.indexOf(i); k >= 0 ? sel.splice(k, 1) : sel.push(i); }
    else { S.survey.answers[st] = [i]; }
    const nowSel = S.survey.answers[st];
    $$('.option', $('#surveyOptions')).forEach((el) => {
      const on = nowSel.includes(+el.dataset.i);
      el.classList.toggle('on', on); $('img', el).src = A(on ? 'check-on.svg' : 'check-off.svg');
      el.style.animation = 'none';
    });
    save();
  });
  function surveyNext() {
    if (S.survey.step < SURVEY.length - 1) { S.survey.step++; renderSurvey(); save(); }
    else go('search');
  }

  /* ---------------- 02 검색 ---------------- */
  function renderPlantList(q) {
    const list = PLANTS.filter((p) => !q || p.name.includes(q.trim()));
    $('#plantListTitle').textContent = q ? '검색 결과' : '많이 키우는 식물';
    $('#plantList').innerHTML = list.length ? list.map((p, i) => `
      <button class="plant-item glass" data-id="${p.id}" style="animation-delay:${i * 40}ms">
        <img src="${plantPhoto(p)}" alt=""${p.img ? '' : ' class="art"'}>
        <span class="pi-text"><b>${p.name}</b><small>${p.desc}</small></span>
        <img src="${A('ic-chevron.svg')}" width="20" height="20" alt="">
      </button>`).join('')
      : `<p class="empty-note">'${q}'에 맞는 식물을 찾지 못했어요.<br>사진을 찍어 찾아볼까요?</p>`;
  }
  $('#plantSearch').addEventListener('input', (e) => renderPlantList(e.target.value));
  $('#plantList').addEventListener('click', (e) => {
    const b = e.target.closest('.plant-item'); if (!b) return;
    S.plant.species = b.dataset.id; go('profile');
  });
  let scanTimers = [];
  function startScan() {
    const ov = $('#scanOverlay');
    ov.classList.remove('found'); ov.classList.add('on'); setDarkBar(true);
    $('#scanText').textContent = '식물을 화면 가운데에 맞춰주세요';
    scanTimers.push(setTimeout(() => { $('#scanText').textContent = '식물을 알아보고 있어요…'; }, 900));
    scanTimers.push(setTimeout(() => { ov.classList.add('found'); $('#scanText').textContent = '몬스테라를 찾았어요!'; }, 2300));
    scanTimers.push(setTimeout(() => { ov.classList.remove('on'); setDarkBar(themeNow() === 'night'); S.plant.species = 'monstera'; go('profile'); }, 3400));
  }
  function stopScan() { scanTimers.forEach(clearTimeout); scanTimers = []; $('#scanOverlay').classList.remove('on'); setDarkBar(themeNow() === 'night'); }
  function setDarkBar(dark) {
    $('#statusbar').classList.toggle('dark', dark); $('#homeInd').classList.toggle('dark', dark);
    $('#sbIcons').src = A(dark ? 'statusbar-dark.svg' : 'statusbar.svg');
  }

  /* ---------------- 03 프로필 ---------------- */
  function renderProfile() {
    const p = PLANTS.find((x) => x.id === S.plant.species) || PLANTS[0];
    $('#profilePhoto').src = plantPhoto(p); $('#profilePhoto').classList.toggle('art', !p.img);
    $('#profileSpecies').textContent = p.name;
    $('#fName').value = S.onboarded ? S.plant.name : '';
    $('#fDate').value = S.plant.date;
    $('#fIntro').value = S.plant.intro;
    $$('#genderChips .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === S.plant.gender));
  }
  $('#genderChips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    S.plant.gender = c.dataset.v;
    $$('#genderChips .chip').forEach((x) => x.classList.toggle('on', x === c));
  });
  function profileDone(later) {
    if (!later) {
      S.plant.name = $('#fName').value.trim() || DEFAULT_PLANT_NAME;
      S.plant.date = $('#fDate').value || S.plant.date;
      S.plant.intro = $('#fIntro').value.trim();
    }
    const first = !S.onboarded;
    S.onboarded = true;
    go('home', { planting: first });
  }

  /* ---------------- 홈 ---------------- */
  const pot = $('#pot');
  const plantInner = $('#plantInner');

  /* ---------------- 시간대 테마 (아침 · 저녁 · 밤) ---------------- */
  function themeNow() {
    if (S.timeMode && S.timeMode !== 'auto') return S.timeMode;
    const h = new Date().getHours();
    if (h >= 5 && h < 17) return 'morning';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }
  function applyTheme() {
    const t = themeNow();
    phone.dataset.theme = t;
    $('.sb-time').textContent = THEMES[t].clock;
    setDarkBar(current === 'arrival' || t === 'night' || $('#scanOverlay').classList.contains('on'));
  }
  setInterval(applyTheme, 60000);

  /* ---------------- 화분 리플 (모듈형 링) ---------------- */
  const rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

  const Pot = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = $('#potMods'); const halo = $('#potHalo');
    // Figma 화분 윗면 링(단 1·3·5·7)의 실제 윤곽 – pot-geo.js
    const G = window.POT_GEO;
    const C = ['pot-1', 'pot-3', 'pot-5', 'pot-7'].map((k) => G[k]);
    // r: 0 = 1번 링(중앙) · 1 = 2번 링(중간) · 2 = 3번 링(바깥)
    const RINGS = [
      { o: C[2], i: C[3], n: 9, top: [220, 226, 215] },
      { o: C[1], i: C[2], n: 12, top: [230, 234, 225] },
      { o: C[0], i: C[1], n: 16, top: [239, 242, 235] },
    ];
    const TAU = Math.PI * 2;
    const pt = (c, a) => {
      const u = ((((a % TAU) + TAU) % TAU) / TAU) * c.r.length; const j = Math.floor(u) % c.r.length; const f = u - Math.floor(u);
      const rr = c.r[j] * (1 - f) + c.r[(j + 1) % c.r.length] * f;
      return [c.cx + rr * Math.cos(a), c.cy + rr * Math.sin(a)];
    };
    const mk = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); parent.appendChild(n); return n; };
    const fmtPts = (arr, dy = 0) => arr.map(([x, y]) => `${x.toFixed(1)},${(y - dy).toFixed(1)}`).join(' ');

    const defs = mk('defs', {}, svg);
    const flt = mk('filter', { id: 'potGlow', x: '-60%', y: '-120%', width: '220%', height: '340%' }, defs);
    mk('feGaussianBlur', { stdDeviation: '4.5' }, flt);
    const glowG = mk('g', { filter: 'url(#potGlow)' }, svg);
    const modG = mk('g', {}, svg);

    const mods = [];
    RINGS.forEach((R, r) => {
      const off = 0.1 + r * 0.21;
      for (let k = 0; k < R.n; k++) {
        const a0 = off + (2 * Math.PI * k) / R.n; const a1 = off + (2 * Math.PI * (k + 1)) / R.n; const g = 0.014;
        const outer = []; const inner = [];
        for (let i = 0; i <= 8; i++) { const a = a0 + g + ((a1 - a0 - 2 * g) * i) / 8; outer.push(pt(R.o, a)); inner.push(pt(R.i, a)); }
        const am = (a0 + a1) / 2;
        mods.push({ r, a: am, a0, a1, outer, inner, my: (pt(R.o, am)[1] + pt(R.i, am)[1]) / 2, h: 0, start: -99, dur: 1, amp: 0, next: 0 });
      }
    });
    mods.sort((p, q) => p.my - q.my); // 뒤에서 앞으로 그리기
    mods.forEach((m) => {
      m.base = fmtPts([...m.outer, ...m.inner.slice().reverse()]);
      m.outerRev = m.outer.slice().reverse(); m.innerRev = m.inner.slice().reverse();
      m.glow = mk('polygon', { points: m.base, opacity: 0 }, glowG);
      m.g = mk('g', { style: 'display:none' }, modG);
      m.slot = mk('polygon', { points: m.base }, m.g);
      m.sideI = mk('polygon', {}, m.g);
      m.sideO = mk('polygon', {}, m.g);
      m.top = mk('polygon', { points: m.base, stroke: '#BCC5B5', 'stroke-width': '0.7', 'stroke-linejoin': 'round' }, m.g);
    });

    /* --- 표현 상태 --- */
    let eventEx = null; let eventUntil = 0; let forcedPattern = 0; let lastP = -1; let lastKey = '';
    // 자동: 캐릭터가 오기 전 Level 1 → 캐릭터 등장 Level 2 → 캐릭터가 어린 잎으로 자라면 Level 3
    function level() {
      if (S.forcedLevel) return S.forcedLevel;
      if (!S.character) return 1;
      return Char.lvl() >= L3_STAGE ? 3 : 2;
    }
    function needsNow() {
      const n = {}; NEED_ORDER.forEach((k) => { n[k] = S.quests[k] === false; }); return n;
    }
    function expr() {
      if (!S.onboarded) return null;
      if (forcedPattern) { const L = level(); return { pattern: forcedPattern, level: L, kind: L === 1 ? 'state' : 'emotion' }; }
      if (eventEx && performance.now() < eventUntil && eventEx.level === level()) return eventEx;
      const n = needsNow();
      for (const k of NEED_ORDER) if (n[k]) return { pattern: NEED_PATTERN[k], level: 1, kind: 'state', need: k };
      return null;
    }
    const meaningLevel = (ex) => (ex.kind === 'state' ? 1 : ex.level);
    function describe(ex) {
      if (!ex) return null;
      const L = meaningLevel(ex);
      return { pattern: ex.pattern, name: PATTERNS[ex.pattern], meaning: MEANING[L][ex.pattern], level: L, light: LEVEL_INFO[L][1] };
    }
    const EVENT_MAP = {
      2: { water: 1, sun: 2, resolve: 2, item: 3, buy: 3, diary: 4, tap: 5, levelup: 5, morning: 5 },
      3: { water: 1, sun: 1, resolve: 1, item: 3, buy: 3, tap: 5, levelup: 5, morning: 5 },
    };
    function event(name, mood) {
      const L = level(); if (L < 2) return; // Level 1은 상태만 알린다
      let p = EVENT_MAP[L][name];
      // Level 3: 오늘 고른 마음에 맞춰 사용자에게 마음을 건넴
      // 평온 → 그대로 존중, 놀람/화남 → 진정, 고민 → 응원, 슬픔 → 더 기쁘게 해주려 함
      if (L === 3 && name === 'diary') p = { calm: 1, surprise: 2, angry: 2, worry: 5, sad: 3 }[mood] || 1;
      if (!p) return;
      eventEx = { pattern: p, level: L, kind: 'emotion' }; eventUntil = performance.now() + 9000;
      renderDev();
    }
    function force(p) { forcedPattern = p; renderDev(); }

    /* --- 움직임 5가지 --- */
    function heightFor(m, p, t) {
      const r = m.r;
      switch (p) {
        case 1: return 1.15 * (1 + Math.sin((2 * Math.PI * t) / 2.6 + m.a * 2 + r * 1.1)); // 잔잔한 낮은 물결
        case 2: { // 한숨: 중앙이 천천히 들이쉬듯 솟고, 잠깐 머문 뒤 탁 내쉬며 바깥으로 퍼짐
          const T = 5.4; const loc = ((t % T) + T) % T;
          const pulse = (start, dur, amp) => (loc >= start && loc <= start + dur ? amp * Math.sin((Math.PI * (loc - start)) / dur) ** 1.5 : 0);
          if (r === 0) {
            if (loc < 1.8) return 12 * (0.5 - 0.5 * Math.cos((Math.PI * loc) / 1.8)); // 들이쉼 (느리게)
            if (loc < 2.15) return 12 + 0.6 * Math.sin((Math.PI * (loc - 1.8)) / 0.35); // 숨 참기
            if (loc < 2.6) { const k = (loc - 2.15) / 0.45; return 12 * (1 - k) ** 3; } // 내쉼 (탁 떨어짐)
            return 0;
          }
          if (r === 1) return 0.8 * Math.sin((Math.PI * Math.min(loc, 1.8)) / 3.6) * (loc < 2.15 ? 1 : 0) + pulse(2.3, 0.85, 7); // 들숨에 살짝 딸려 오르고, 날숨에 크게 출렁
          return pulse(2.6, 1.05, 5) + pulse(3.6, 0.9, 1.6); // 바깥까지 쫙 퍼지고 잔물결
        }
        case 3: { // 서로 다른 타이밍으로 불규칙하게
          if (t > m.start + m.dur) {
            if (t < m.next) return 0;
            m.start = t; m.dur = 0.8 + Math.random() * 0.9; m.amp = 4 + Math.random() * 4.5; m.next = t + m.dur + 0.5 + Math.random() * 3.2;
          }
          return m.amp * Math.sin((Math.PI * (t - m.start)) / m.dur);
        }
        case 4: { // 1번 → 2번 → 3번 링 순서대로 천천히
          const T = 6.8; const loc = (t % T) - r * 2.1;
          return loc >= 0 && loc <= 2.4 ? 6.4 * Math.sin((Math.PI * loc) / 2.4) : 0;
        }
        case 5: { // 위쪽에서 시작해 시계 방향으로 한 바퀴
          if (r === 0) return 0;
          const head = -Math.PI / 2 + 2 * Math.PI * ((t / 4.4) % 1) - (r === 1 ? 0.28 : 0);
          const d = Math.atan2(Math.sin(m.a - head), Math.cos(m.a - head));
          const amp = r === 2 ? 7.5 : 4;
          if (d > 0.16 || d < -1.7) return 0;
          return d > 0 ? amp * (1 - d / 0.16) : amp * (1 + d / 1.7) ** 1.4;
        }
        default: return 0;
      }
    }

    let lastT = 0; let haloNow = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (current !== 'home') { lastT = 0; return; }
      const t = now / 1000; const dt = Math.min(0.05, lastT ? t - lastT : 0.016); lastT = t;
      const ex = expr(); const p = ex ? ex.pattern : 0;
      if (p === 3 && lastP !== 3) mods.forEach((m) => { m.start = -99; m.next = t + Math.random() * 2.2; });
      lastP = p;
      const L = ex ? meaningLevel(ex) : level();
      const lc = LIGHT[L]; const th = THEMES[themeNow()];
      const key = `${L}|${themeNow()}`;
      if (key !== lastKey) {
        lastKey = key; glowG.setAttribute('fill', rgb(lc)); halo.style.setProperty('--lc', lc.join(','));
      }
      plantInner.classList.toggle('thirsty', !!ex && ex.kind === 'state' && ex.pattern === 1);
      let total = 0;
      const topDim = (c) => c.map((v) => v * th.dim);
      mods.forEach((m) => {
        const tgt = p ? heightFor(m, p, t) : 0;
        m.h += (tgt - m.h) * Math.min(1, dt * 10);
        total += m.h;
        const k = Math.min(1, m.h / 5);
        m.glow.setAttribute('opacity', (th.light * k).toFixed(3));
        const vis = m.h > 0.12;
        if (m.vis !== vis) { m.g.style.display = vis ? '' : 'none'; m.vis = vis; }
        if (!vis) return;
        const h = m.h;
        m.top.setAttribute('transform', `translate(0 ${(-h).toFixed(2)})`);
        m.sideO.setAttribute('points', `${fmtPts(m.outer)} ${fmtPts(m.outerRev, h)}`);
        m.sideI.setAttribute('points', `${fmtPts(m.inner)} ${fmtPts(m.innerRev, h)}`);
        const top = topDim(RINGS[m.r].top);
        const side = mix(top.map((v) => v * 0.8), lc, th.light * 0.85 * k);
        m.top.setAttribute('fill', rgb(mix(top, lc, th.light * 0.18 * k)));
        m.sideO.setAttribute('fill', rgb(side)); m.sideI.setAttribute('fill', rgb(side));
        if (th.light > 0) { m.slot.setAttribute('fill', rgb(lc)); m.slot.setAttribute('opacity', (k * th.light).toFixed(2)); }
        else { m.slot.setAttribute('fill', '#7d8775'); m.slot.setAttribute('opacity', (0.4 * k).toFixed(2)); }
      });
      haloNow += (Math.min(1, total / (mods.length * 1.6)) - haloNow) * Math.min(1, dt * 2.5); // 깜빡임 없이 은은하게
      halo.style.opacity = (haloNow * th.light).toFixed(3);
    }
    requestAnimationFrame(frame);

    // 캐릭터가 서 있는 자리의 모듈 높이 (바깥 링)
    function liftAt(theta) {
      const a = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      for (const m of mods) {
        if (m.r !== 2) continue;
        let a0 = m.a0 % (2 * Math.PI); let a1 = a0 + (m.a1 - m.a0);
        if ((a >= a0 && a <= a1) || (a + 2 * Math.PI >= a0 && a + 2 * Math.PI <= a1)) return m.h;
      }
      return 0;
    }

    return { level, expr, describe, event, force, liftAt, get forced() { return forcedPattern; }, needsNow };
  })();

  function addBond(n) { S.bond += n; save(); checkLevel(); renderDev(); }
  function checkLevel() {
    const L = Pot.level();
    if (L > (S.levelSeen || 1)) {
      S.levelSeen = L; save();
      setTimeout(() => {
        Pot.event('levelup'); devNote(`화분 이해도 Level ${L}로 올라감`);
      }, 1400);
    }
  }

  function openPotSheet() {
    Pot.event('tap');
    plantInner.classList.remove('wiggle'); void plantInner.offsetWidth; plantInner.classList.add('wiggle');
  }
  $('#pot').addEventListener('click', openPotSheet);

  function questionFor(dateISO) { return QUESTIONS[((dayDiff(START_DATE, dateISO) % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length]; }

  function renderItems() {
    $('#cntPoint').textContent = fmt(S.points);
    $('#cntWater').textContent = S.water;
    $('#cntHeart').textContent = S.heart;
    $('#cntSun').textContent = S.sun;
  }
  function bumpChip(item) { const c = $(`.item-chip[data-item="${item}"]`); if (!c) return; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }

  function renderQuests(popKey) {
    const keys = [...Object.keys(S.quests).filter((k) => k !== 'diary' && QUESTS[k]), 'diary'];
    const done = keys.filter((k) => S.quests[k]).length;
    $('#questCount').innerHTML = `<b>${done}</b> / ${keys.length} 완료`;
    $('#questList').innerHTML = keys.map((k) => {
      const q = QUESTS[k]; const d = S.quests[k];
      return `<button class="quest${d ? ' done' : ''}" data-q="${k}">
        <span class="bar" style="background:${q.color}"></span>
        <span class="qt"><b>${q.title}</b><span><img src="${A(q.icon)}" width="12" height="12" alt="">${q.reward}</span></span>
        ${d ? `<img class="check${popKey === k ? ' pop' : ''}" src="${A('ic-done.svg')}" alt="완료">` : ''}
      </button>`;
    }).join('');
    $('#notiDot').classList.toggle('on', done < keys.length);
  }

  function renderTodayQ() {
    const rec = S.records[S.today];
    const card = $('#todayQ');
    card.classList.toggle('done', !!rec);
    if (rec) {
      $('#todayQText').textContent = '오늘의 기록을 남겼어요\n내일 새 질문이 찾아와요';
      $('#todayQBtn').textContent = '기록 보러 가기';
    } else {
      $('#todayQText').textContent = questionFor(S.today).q;
      $('#todayQBtn').textContent = '답하러 가기';
    }
  }

  function highlightDeco(id) {
    setTimeout(() => { const d = $(`.deco[data-id="${id}"]`); if (d) { d.classList.remove('new'); void d.offsetWidth; d.classList.add('new'); } }, 60);
  }
  function decoPos(g) { const p = S.decoPos[g.id]; return p ? [p[0], p[1], g.pos[2]] : g.pos; }
  function renderDeco() {
    $('#decoLayer').innerHTML = S.placed.map((id) => {
      const g = GOODS.find((x) => x.id === id); if (!g) return '';
      const [l, t, w] = decoPos(g);
      return `<img class="deco" data-id="${id}" draggable="false" src="${A(g.img)}" alt="${g.name}" style="left:${l}px;top:${t}px;width:${w}px;height:${w}px;z-index:${t + w > 488 ? 5 : 2}">`;
    }).join('');
  }
  // 정원 소품 끌어서 옮기기
  (() => {
    let drag = null;
    $('#decoLayer').addEventListener('pointerdown', (e) => {
      const d = e.target.closest('.deco'); if (!d) return;
      e.preventDefault(); e.stopPropagation();
      drag = { el: d, x0: e.clientX, y0: e.clientY, l0: parseFloat(d.style.left), t0: parseFloat(d.style.top), w: parseFloat(d.style.width) };
      d.setPointerCapture(e.pointerId); d.classList.add('dragging');
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const sc = phone.getBoundingClientRect().width / 375;
      const l = Math.max(-10, Math.min(375 - drag.w + 10, drag.l0 + (e.clientX - drag.x0) / sc));
      const t = Math.max(250, Math.min(540 - drag.w, drag.t0 + (e.clientY - drag.y0) / sc));
      drag.el.style.left = `${l}px`; drag.el.style.top = `${t}px`;
      drag.el.style.zIndex = t + drag.w > 488 ? 5 : 2;
    });
    addEventListener('pointerup', () => {
      if (!drag) return;
      drag.el.classList.remove('dragging');
      S.decoPos[drag.el.dataset.id] = [Math.round(parseFloat(drag.el.style.left)), Math.round(parseFloat(drag.el.style.top))];
      save(); drag = null;
    });
  })();

  function renderPlant() {
    const art = plantArt(S.plant.species);
    const stem = $('.plant-stem'); const lv = $('.plant-leaves');
    stem.hidden = !!art;
    lv.src = A(art || 'plant-leaves.svg');
    lv.classList.toggle('full', !!art);
  }
  function renderHome(opts = {}) {
    renderPlant();
    renderItems(); renderQuests(); renderTodayQ(); renderDeco();
    $('#questSheet').classList.remove('open');
    if (opts.planting) {
      plantInner.classList.remove('planting'); void plantInner.offsetWidth; plantInner.classList.add('planting');
      setTimeout(() => toast(`${josa(S.plant.name, '을', '를')} 심었어요`, 2400), 400);
    }
    Char.sync();
  }

  /* ---------------- 캐릭터 (나를 닮은 식물) ---------------- */
  const Char = (() => {
    const wrapEl = $('#charWrap'); const el = $('#char'); const bodyEl = $('#charBody'); let faceEl = null; let typeNow = '';
    const CX = 188.5, CY = 466, RX = 138, RY = 50;
    let theta = 0.32, target = 0.32, moving = false, pauseUntil = 0, last = 0, raf = 0;
    let dir = 1, busyUntil = 0, scaleNow = 0, visit = false, lastX = CX + RX * Math.cos(theta);
    let face = '', act = null, fxAt = 0;
    let z = 0, vz = 0, vth = 0, spin = 0, vspin = 0, prevSurf = 0;
    const TOSS = { 1: 1.4, 2: 6, 3: 3.2, 4: 4, 5: 1.1 }; // Level 1 상태 파동에 튕겨 나가는 세기
    const ACTS = ['walking', 'idle', 'dizzy', 'bounce', 'slow', 'restless', 'skip', 'sigh', 'party', 'stretch', 'breathe', 'cheer'];

    function lvl() { return S.character ? Math.min(LEVELS.length - 1, Math.floor(S.character.xp / XP_PER_LEVEL)) : 0; }
    function say() { /* 말풍선은 쓰지 않는다 – 표정과 몸짓으로만 표현 */ }
    function setType(type) {
      if (typeNow === type) return; typeNow = type;
      bodyEl.innerHTML = bodyHTML(type, face || 'default'); faceEl = $('.c-face', bodyEl);
      el.classList.toggle('layered', !!CHARS[type].layered);
    }
    function setFace(k) {
      if (face === k) return; face = k;
      if (faceEl) faceEl.innerHTML = (CHARS[typeNow].layered ? CHEEKS : '') + (FACES[k] || FACES.default);
    }
    function setState(cls) { ACTS.forEach((c) => el.classList.toggle(c, c === cls)); }
    function jump() { el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump'); setTimeout(() => el.classList.remove('jump'), 720); }
    function pos() { return { x: CX + RX * Math.cos(theta), y: CY + RY * Math.sin(theta) }; }
    function updateDir() { const nx = CX + RX * Math.cos(theta); if (Math.abs(nx - lastX) > 0.01) dir = nx < lastX ? -1 : 1; lastX = nx; }
    function wander(dt, now, speed, eager) {
      if (moving) {
        const d = Math.atan2(Math.sin(target - theta), Math.cos(target - theta)); const step = speed * dt;
        if (Math.abs(d) <= step) {
          theta = target; moving = false; pauseUntil = now + (eager ? 250 + Math.random() * 600 : 1200 + Math.random() * 2600);
          if (visit) { visit = false; interactPlant(); }
        } else { theta += Math.sign(d) * step; updateDir(); }
        return 'walking';
      }
      if (now > pauseUntil) {
        visit = !eager && Math.random() < 0.28;
        target = visit ? Math.PI / 2 + (Math.random() - 0.5) * 0.5 : theta + (Math.random() * 2 - 1) * (eager ? 1.6 : Math.PI);
        moving = true;
      }
      return 'idle';
    }
    function moveTo(goal, dt, speed) {
      const d = Math.atan2(Math.sin(goal - theta), Math.cos(goal - theta)); const step = speed * dt;
      if (Math.abs(d) <= step) { theta = goal; return true; }
      theta += Math.sign(d) * step; updateDir(); return false;
    }
    function fx(kind) {
      const { x, y } = pos(); const head = y - 84 * scaleNow - Pot.liftAt(theta) - z;
      const src = { sparkle: 'sparkle-1.svg', heart: 'ic-heart.svg', sweat: 'ic-drop.svg' }[kind];
      const sz = kind === 'sweat' ? 10 : 14;
      floatFx(`<img src="${A(src)}" width="${sz}" height="${sz}" alt="">`, x - sz / 2 + (Math.random() - 0.5) * 26, head - 4);
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (current !== 'home' || !S.character) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      const now = performance.now();
      const ex = Pot.expr();
      setType(S.charType);
      const r = ex ? REACT[`${ex.kind === 'state' ? 1 : ex.level}-${ex.pattern}`] : null;
      const stateWave = !!ex && ex.kind === 'state';
      const a = r ? r.act : null;
      if (a !== act) { act = a; moving = false; pauseUntil = now + 400; }
      setFace(r ? r.face : 'default');
      let cls = 'idle';
      if (now < busyUntil) cls = 'idle';
      else if (!r) cls = wander(dt, now, 0.42, false);
      else {
        switch (r.act) {
          case 'bounce': cls = 'bounce'; break; // 제자리에서 통통 – 목말라
          case 'slow': cls = wander(dt, now, 0.13, false) === 'walking' ? 'slow' : 'idle'; break;
          case 'restless': cls = 'restless'; theta += Math.sin(now / 260) * dt * 0.6; break;
          case 'dizzy': cls = 'dizzy'; theta += Math.sin(now / 160) * 0.004; break;
          case 'skip': wander(dt, now, 0.45, true); cls = 'skip'; break; // 웃으며 사뿐사뿐
          case 'sigh': cls = 'sigh'; break;
          case 'party': cls = 'party'; break;
          case 'stretch': cls = 'stretch'; break;
          case 'orbit': theta += 0.4 * dt; updateDir(); cls = 'skip'; break; // 식물 곁을 맴돎
          case 'still': cls = moveTo(1.3, dt, 0.5) ? 'breathe' : 'walking'; break;
          case 'breathe': cls = 'breathe'; break;
          case 'cheer': cls = 'cheer'; dir = 1; break;
          default: break;
        }
      }
      setState(cls);
      if (r && now > fxAt) {
        const k = { party: ['sparkle', 700], cheer: ['sparkle', 900], orbit: ['heart', 1300], bounce: ['sweat', 1500] }[r.act];
        if (k) { fx(k[0]); fxAt = now + k[1]; }
      }
      // Level 1 상태 파동: 발밑 모듈이 솟구치면 몸이 이리저리 튕겨 나감
      const surf = Pot.liftAt(theta);
      const dS = (surf - prevSurf) / Math.max(dt, 0.001); prevSurf = surf;
      if (stateWave && z <= 0.01 && dS > 6) {
        vz = Math.min(190, dS * TOSS[ex.pattern] + 30);
        const side = Math.random() < 0.5 ? -1 : 1;
        if (ex.pattern === 3) vth += side * (0.55 + Math.random() * 0.6); // 이쪽저쪽으로 튐
        else if (ex.pattern === 5) vth += 0.8; // 도는 방향으로 휩쓸림
        else if (ex.pattern === 2) { vz += 15; vth += side * 0.45; }
        else vth += side * 0.3;
        moving = false;
      }
      if (stateWave && ex.pattern === 3 && z <= 0.01 && Math.random() < dt * 0.4) { vz = 80 + Math.random() * 50; vth += (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5); }
      if (z > 0 || vz > 0) {
        vz -= 640 * dt; z += vz * dt;
        if (z <= 0) { z = 0; if (vz < -90) { el.classList.remove('land'); void el.offsetWidth; el.classList.add('land'); } vz = 0; vspin = 0; }
      }
      theta += vth * dt; vth *= Math.max(0, 1 - dt * 2.4);
      // 몸은 똑바로 – 튀는 방향으로만 살짝 기울어짐
      const tilt = Math.max(-9, Math.min(9, vth * 9)) * (z > 0 ? 1 : 0.4);
      spin += (tilt - spin) * Math.min(1, dt * 10);
      if (Math.abs(vth) > 0.05) updateDir();
      // 위치 / 원근 / 레이어 (발밑 모듈이 올라오면 같이 들림)
      const { x, y } = pos();
      const depth = (Math.sin(theta) + 1) / 2;
      scaleNow += (LEVELS[lvl()].scale - scaleNow) * Math.min(1, dt * 3);
      const s = scaleNow * (0.84 + 0.16 * depth);
      wrapEl.style.transform = `translate(${x - 30}px, ${y - 81 - surf - z}px) scale(${s})`;
      el.style.transform = `scaleX(${dir}) rotate(${spin.toFixed(1)}deg)`;
      $('.c-shadow', el).style.opacity = (1 - Math.min(0.7, z / 50)).toFixed(2);
      wrapEl.style.zIndex = Math.sin(theta) < -0.05 ? 2 : 4;
    }
    setType(S.charType); setFace('default');

    function interactPlant() {
      busyUntil = performance.now() + 1800;
      plantInner.classList.remove('wiggle'); void plantInner.offsetWidth; plantInner.classList.add('wiggle');
      const { x, y } = pos();
      floatFx(`<img src="${A('ic-heart.svg')}" width="18" height="18" alt="">`, x - 9, y - 84 * scaleNow - 6);
      jump();
    }

    function sync() {
      const has = !!S.character;
      wrapEl.hidden = !has;
      if (has && !raf) { scaleNow = LEVELS[lvl()].scale; raf = requestAnimationFrame(frame); }
    }

    function arrive() {
      theta = Math.PI / 2; target = theta; moving = false; pauseUntil = performance.now() + 2600;
      scaleNow = 0.05;
      wrapEl.classList.remove('appear'); void wrapEl.offsetWidth; wrapEl.classList.add('appear');
      setTimeout(() => jump(), 700);
    }

    function useItem(type) {
      if (!S.character) return false;
      const { x, y } = pos();
      const head = y - 84 * scaleNow;
      const icon = { water: 'item-drop-24.svg', heart: 'item-heart-24.svg', sun: 'item-sun-24.svg' }[type];
      const fx = document.createElement('img');
      fx.src = A(icon); fx.className = 'fx fx-drop'; fx.width = 24; fx.height = 24;
      fx.style.left = `${x - 12}px`; fx.style.top = `${head - 10}px`;
      $('#fxLayer').appendChild(fx);
      busyUntil = performance.now() + 2000; moving = false;
      setTimeout(() => {
        fx.remove();
        if (type === 'water') {
          for (let i = 0; i < 6; i++) {
            const sp = document.createElement('span'); sp.className = 'fx fx-splash';
            const a = (Math.PI / 6) * i + Math.PI; sp.style.left = `${x - 4}px`; sp.style.top = `${head}px`;
            sp.style.setProperty('--dx', `${Math.cos(a) * 22}px`); sp.style.setProperty('--dy', `${Math.sin(a) * 14 - 6}px`);
            $('#fxLayer').appendChild(sp); setTimeout(() => sp.remove(), 650);
          }
        }
        jump();
        const gain = type === 'water' ? 40 : 30;
        const before = lvl();
        S.character.xp += gain; save(); checkLevel();
        floatFx(`<span class="fx-label">+${gain} XP</span>`, x - 22, head - 16);
        const after = lvl();
        if (after > before) setTimeout(() => { say(`${LEVELS[after].name}로 자랐어요!`, 2600); toast(`${josa(S.character.name, '이', '가')} ${josa(LEVELS[after].name, '으로', '로')} 자랐어요`); }, 600);
        else say({ water: '시원해요!', heart: '따뜻해요', sun: '반짝반짝!' }[type], 1600);
        renderDev();
      }, 760);
      return true;
    }

    function tap() {
      if (!S.character) return;
      jump();
      const l = lvl(); const xp = S.character.xp % XP_PER_LEVEL;
      const max = l === LEVELS.length - 1;
      openSheet(`<h3>${S.character.name}</h3><p class="sub">나의 하루를 닮아가는 식물</p>
        <div class="list"><div class="row"><b>성장</b><span>${LEVELS[l].name}</span></div>
        <div class="row"><b>경험치</b><span>${max ? '다 자랐어요' : `${xp} / ${XP_PER_LEVEL}`}</span></div></div>
        <button class="btn-text" data-sh="close" style="margin-top:16px">닫기</button>`, { close: closeSheet });
    }
    wrapEl.addEventListener('click', tap);

    function grow(xp) { if (!S.character) return; const b = lvl(); S.character.xp += xp; const a = lvl(); save(); if (a > b) { jump(); say(`${LEVELS[a].name}로 자랐어요!`, 2400); } checkLevel(); }

    return { sync, arrive, useItem, lvl, grow, say, jump };
  })();

  function floatFx(html, x, y) {
    const d = document.createElement('div');
    d.className = 'fx fx-float'; d.innerHTML = html; d.style.left = `${x}px`; d.style.top = `${y}px`;
    $('#fxLayer').appendChild(d); setTimeout(() => d.remove(), 1450);
  }

  function useFromInventory(type) {
    if (S[type] <= 0) { toast('가지고 있는 아이템이 없어요'); return; }
    if (!S.character) { toast('아직 이 아이템은 쓸 수 없어요'); return; }
    S[type]--; renderItems(); save();
    Char.useItem(type); Pot.event('item'); addBond(1);
  }

  /* ---------------- 화분 센서 이벤트 (09 돌봄 아이템 받기) ---------------- */
  function giveXP(n) {
    if (S.character) Char.grow(n); else S.xpBank += n; // 캐릭터가 오기 전 경험치는 모아뒀다가 전해준다
  }
  // 실제 화분에서 돌봄이 감지됨 → 퀘스트 완료 · 보상(아이템 + 경험치)
  function careAction(k) {
    if (!S.onboarded) { toast('먼저 식물을 등록해주세요'); return; }
    if (current !== 'home') go('home');
    if (Pot.forced === NEED_PATTERN[k] || (Pot.forced && Pot.level() === 1)) Pot.force(0);
    const q = QUESTS[k]; const wanted = S.quests[k] === false;
    S.care++;
    (S.careLog[S.today] = S.careLog[S.today] || []).push({ type: q.care, time: nowTime() });
    if (!wanted) { save(); toast(`${CARE_ACTIONS[k]} 완료`); devNote('화분이 원하던 돌봄이 아니라 보상 없음'); Pot.event('resolve'); return; }
    S.quests[k] = true; S[q.item]++;
    giveXP(CARE_XP);
    save();
    renderItems(); renderQuests(k); bumpChip(q.item);
    Pot.event(k === 'thirst' ? 'water' : k === 'sun' ? 'sun' : 'resolve'); addBond(1);
    setTimeout(() => showItemSheet(k), 650);
  }

  function showItemSheet(k) {
    const q = QUESTS[k]; const type = q.item;
    const inv = [['water', '물방울', 'item-drop-24.svg'], ['heart', '마음', 'item-heart-24.svg'], ['sun', '햇빛', 'item-sun-24.svg']];
    openSheet(`
      <h3>${q.got}</h3>
      <p class="sub">${q.did(S.plant.name)}, +${CARE_XP} XP</p>
      <div class="hero-item${ITEM_ICON[type][1]}"><img src="${A(ITEM_ICON[type][0])}" width="56" height="56" alt=""></div>
      <div class="inv">${inv.map(([kk, n, ic]) => `<div class="inv-item${kk === type ? ' on' : ''}"><span class="circle"><img src="${A(ic)}" width="24" height="24" alt=""></span><small>${n}</small><b>${S[kk]}개</b></div>`).join('')}</div>
      <button class="btn btn-primary" data-sh="use">나에게 사용하기</button>
      <button class="btn-text" data-sh="keep">보관함에 넣기</button>`, {
      use: () => {
        closeSheet();
        if (!S.character) { toast('아직 이 아이템은 쓸 수 없어요\n보관함에 넣어둘게요', 2400); return; }
        setTimeout(() => useFromInventory(type), 380);
      },
      keep: () => { closeSheet(); toast('보관함에 넣었어요'); },
    });
  }

  /* ---------------- 05 문답 일기 ---------------- */
  let diaryMood = null;
  function renderDiary() {
    const d = parseISO(S.today);
    $('#diaryDate').textContent = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    const q = questionFor(S.today);
    $('#diaryQ').textContent = q.q;
    $('#diaryFollow').textContent = q.f;
    const rec = S.records[S.today];
    $('#diaryAnswer').value = rec ? rec.a : '';
    $('#diaryExtra').value = rec ? rec.extra || '' : '';
    diaryMood = rec ? rec.mood : null;
    updateCount(); renderMoodRow();
    $('.diary-scroll').scrollTop = 0;
  }
  function renderMoodRow() {
    $('#moodRow').innerHTML = MOOD_ORDER.map((k) => `<button class="mood-opt${diaryMood === k ? ' on' : ''}" data-m="${k}"><span class="mood-btn">${moodHTML(k, 44)}</span><span>${MOODS[k].label}</span></button>`).join('');
  }
  function updateCount() { $('#diaryCount').textContent = `${$('#diaryAnswer').value.length} / 200`; }
  $('#diaryAnswer').addEventListener('input', updateCount);
  $('#moodRow').addEventListener('click', (e) => { const b = e.target.closest('.mood-opt'); if (!b) return; diaryMood = b.dataset.m; renderMoodRow(); });

  async function diaryDone() {
    const a = $('#diaryAnswer').value.trim();
    if (!a) { toast('한 줄이라도 적어볼까요?'); $('#diaryAnswer').focus(); return; }
    if (!diaryMood) { toast('오늘 나의 마음을 골라주세요'); return; }
    const first = !S.records[S.today];
    S.records[S.today] = { mine: true, mood: diaryMood, q: questionFor(S.today).q.replace('\n', ' '), a, extra: $('#diaryExtra').value.trim() };
    if (first) {
      S.quests.diary = true; S.points += 50; S.diaryCount++;
    }
    save();
    go('home');
    if (!first) { toast('기록을 고쳤어요'); return; }
    renderQuests('diary'); bumpChip('point');
    Pot.event('diary', diaryMood); addBond(2);
    if (!S.character) {
      const n = Math.min(S.diaryCount, UNDERSTAND_GOAL);
      toast('기록 완료! 50P'); devNote(`문답 ${n}/${UNDERSTAND_GOAL} (새 식물 등장까지)`);
      if (S.diaryCount >= UNDERSTAND_GOAL) {
        await sleep(2800);
        toast('이제 당신을 조금 알 것 같아요…\n누군가 찾아오고 있어요', 2400);
        await sleep(2600);
        go('arrival');
      }
    } else {
      toast('기록 완료! 50P');
    }
  }

  /* ---------------- 06 달력 ---------------- */
  let calView = null; let calSel = null;
  function monthOf(iso) { const d = parseISO(iso); return { y: d.getFullYear(), m: d.getMonth() }; }
  function renderCalendar() {
    const { y, m } = calView;
    $('#monthLabel').textContent = `${y}년 ${m + 1}월`;
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push('<span class="day blank"></span>');
    for (let d = 1; d <= days; d++) {
      const iso = toISO(new Date(y, m, d));
      const future = iso > S.today; const today = iso === S.today;
      const rec = S.records[iso];
      let inner = `<span class="n">${d}</span>`;
      if (rec) inner += `<span class="ic">${moodHTML(rec.mood, 22)}</span>`;
      else if (!future && !today && iso >= '2026-10-01') inner += `<img class="none" src="${A('day-empty.png')}" alt="">`;
      cells.push(`<button class="day${future ? ' future' : ''}${today ? ' today' : ''}${iso === calSel ? ' sel' : ''}" data-d="${iso}" ${future ? 'disabled' : ''}>${inner}</button>`);
    }
    while (cells.length % 7) cells.push('<span class="day blank"></span>');
    let html = '';
    for (let i = 0; i < cells.length; i += 7) html += `<div class="cal-row">${cells.slice(i, i + 7).join('')}</div>`;
    $('#calGrid').innerHTML = html;
    const tm = monthOf(S.today);
    $('[data-action="month"][data-d="1"]').disabled = y > tm.y || (y === tm.y && m >= tm.m);
    $('[data-action="month"][data-d="-1"]').disabled = y < 2026 || (y === 2026 && m <= 8);
    renderDayCard();
  }
  function renderDayCard() {
    const d = parseISO(calSel);
    const rec = S.records[calSel];
    const care = S.careLog[calSel] || [];
    let html = `<p>${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일</p>`;
    if (rec) {
      html += `<button class="rec" data-action="${calSel === S.today ? 'open-diary' : ''}"><span class="rec-mood">${moodHTML(rec.mood, 40)}</span><span class="rec-text"><small>내 기록 (${MOODS[rec.mood].label})</small><b>${rec.q}</b><span>${rec.a}</span></span></button>`;
    } else if (calSel === S.today) {
      html += `<div class="rec-empty">아직 오늘의 기록이 없어요<br><button data-action="open-diary">오늘의 질문에 답하러 가기</button></div>`;
    } else {
      html += `<div class="rec-empty">이날은 기록이 없어요</div>`;
    }
    if (care.length) {
      html += `<div class="care"><small>돌봄</small>${care.map((c) => `<div class="care-row"><img src="${A(CARE_TYPES[c.type].icon)}" width="16" height="16" alt=""><b>${CARE_TYPES[c.type].label}</b><span>${c.time}</span></div>`).join('')}</div>`;
    }
    $('#dayCard').innerHTML = html;
  }
  $('#calGrid').addEventListener('click', (e) => { const b = e.target.closest('.day[data-d]'); if (!b || b.disabled) return; calSel = b.dataset.d; renderCalendar(); });

  /* ---------------- 10 상점 ---------------- */
  let shopCat = 'all';
  function renderShop() {
    $('#shopPoint').textContent = fmt(S.points);
    $$('#shopCats .cat').forEach((c) => c.classList.toggle('on', c.dataset.cat === shopCat));
    const list = GOODS.filter((g) => shopCat === 'all' || g.cat === shopCat);
    $('#goods').innerHTML = list.length ? list.map((g, i) => `
      <button class="good glass" data-action="buy" data-id="${g.id}" style="animation-delay:${i * 35}ms">
        <span class="good-art"><img src="${A(g.img)}" alt=""></span>
        <b>${g.name}</b>
        ${S.owned.includes(g.id) ? '<span class="owned">보유 중</span>' : `<span class="price"><img src="${A('ic-point.svg')}" width="16" height="16" alt="">${fmt(g.price)}</span>`}
      </button>`).join('') : '<p class="empty-cat">곧 새로운 아이템이 들어와요</p>';
  }
  function openGood(id) {
    const g = GOODS.find((x) => x.id === id); if (!g) return;
    const owned = S.owned.includes(id); const placed = S.placed.includes(id);
    const enough = S.points >= g.price;
    openSheet(`
      <h3>${g.name}</h3>
      <p class="sub">${g.desc}</p>
      <div class="hero-item" style="filter:none;background:#f4f6f1"><img src="${A(g.img)}" width="80" height="80" alt=""></div>
      ${owned
        ? `<p class="sub" style="margin-top:20px">${placed ? '지금 정원에 놓여 있어요' : '보관함에 들어 있어요'}</p>
           <button class="btn btn-primary" data-sh="${placed ? 'home' : 'place'}">${placed ? '정원 보러 가기' : '정원에 꺼내 놓기'}</button>`
        : `<p class="sub" style="margin-top:20px">보유 포인트 ${fmt(S.points)}P</p>
           <button class="btn btn-primary" data-sh="buy" ${enough ? '' : 'disabled'}>${enough ? `${fmt(g.price)}P로 구매하기` : '포인트가 부족해요'}</button>
           <button class="btn-text" data-sh="close">다음에 살게요</button>`}`, {
      buy: () => {
        S.points -= g.price; S.owned.push(id); S.placed.push(id); save();
        Pot.event('buy');
        go('home'); highlightDeco(id);
        toast(`${josa(g.name, '을', '를')} 정원에 놓았어요\n끌어서 원하는 곳으로 옮겨보세요`, 2600);
      },
      place: () => { if (!S.placed.includes(id)) S.placed.push(id); save(); go('home'); highlightDeco(id); },
      home: () => go('home'),
      close: closeSheet,
    });
  }
  $('#shopCats').addEventListener('click', (e) => { const c = e.target.closest('.cat'); if (!c) return; shopCat = c.dataset.cat; renderShop(); });

  /* ---------------- 11 마이 ---------------- */
  function renderMy() {
    $('#myName').textContent = S.nick;
    $('#myAvatar').innerHTML = S.character
      ? `<span style="position:relative;width:64px;height:64px;display:block">${miniCharHTML(44, 64)}</span>`
      : `<span style="position:relative;width:52px;height:52px;display:block"><img src="${A('avatar-calm.svg')}" alt="" style="position:absolute;left:0;top:0;width:52px;height:58.07px"></span>`;
    $('#statDays').textContent = `${Object.keys(S.records).length}일`;
    $('#statCare').textContent = `${S.care}회`;
    $('#statPoint').textContent = fmt(S.points);
    const p = PLANTS.find((x) => x.id === S.plant.species) || PLANTS[0];
    const dplus = Math.max(1, dayDiff(S.plant.date, S.today) + 1);
    let html = `<button class="my-plant glass" data-action="plant-info"><img class="mp-img${p.img ? '' : ' art'}" src="${plantPhoto(p)}" alt=""><span class="mp-text"><b>${S.plant.name}</b><small>D+${dplus}</small></span></button>`;
    if (S.character) {
      const l = Char.lvl();
      html += `<button class="my-plant glass" data-action="tab" data-to="home"><span class="mp-char">${miniCharHTML(36, 48)}</span><span class="mp-text"><b>${S.character.name}</b><small>${LEVELS[l].name}</small></span></button>`;
    }
    $('#myPlants').innerHTML = html;
  }

  function openMenu(m) {
    if (m === 'pot') {
      const moist = S.quests.thirst === false ? 31 : 78;
      openSheet(`<h3>화분 연결 관리</h3><p class="sub">ONGI 화분과 연결되어 있어요</p>
        <div class="list">
          <div class="row"><span class="status-dot"></span><b>ONGI 화분 (거실)</b><span>연결됨</span></div>
          <div class="row"><b>토양 수분</b><span>${moist}%</span></div>
          <div class="row"><b>오늘 받은 햇빛</b><span>${S.quests.sun === false ? '부족해요' : '2시간 40분'}</span></div>
          <div class="row"><b>배터리</b><span>82%</span></div>
        </div>
        <button class="btn-text" data-sh="close" style="margin-top:16px">닫기</button>`, { close: closeSheet });
    } else if (m === 'box') {
      openBox();
    } else if (m === 'noti') {
      const t = ['아침', '점심', '저녁', '잠들기 전'][S.survey.answers[2][0] ?? 2];
      const rows = [['daily', '오늘의 질문 알림', `${t}에 보내드려요`], ['care', '화분 돌봄 알림', '물이나 햇빛이 필요할 때'], ['news', '새 식물 소식', '나를 닮은 식물의 성장']];
      openSheet(`<h3>알림 설정</h3><div class="list">${rows.map(([k, n, d]) => `<button class="row" data-sh="toggle" data-k="${k}"><b>${n}<br><span>${d}</span></b><span class="switch${S.noti[k] ? ' on' : ''}"></span></button>`).join('')}</div>
        <button class="btn-text" data-sh="close" style="margin-top:16px">닫기</button>`, {
        toggle: (b) => { const k = b.dataset.k; S.noti[k] = !S.noti[k]; save(); $('.switch', b).classList.toggle('on', S.noti[k]); },
        close: closeSheet,
      });
    } else if (m === 'notice') {
      openSheet(`<h3>공지사항</h3><div class="list">
        <div class="row"><b>상점에 정원 소품이 들어왔어요</b><span>10.15</span></div>
        <div class="row"><b>화분 펌웨어 1.2 업데이트 안내</b><span>10.02</span></div>
        <div class="row"><b>ONGI를 시작해주셔서 고마워요</b><span>09.20</span></div>
        </div><button class="btn-text" data-sh="close" style="margin-top:16px">닫기</button>`, { close: closeSheet });
    } else if (m === 'cs') {
      openSheet(`<h3>고객센터</h3><div class="list">
        <div class="row"><b>화분이 연결되지 않아요</b></div>
        <div class="row"><b>파동 무늬는 무슨 뜻인가요?</b></div>
        <div class="row"><b>나를 닮은 식물은 언제 찾아오나요?</b></div>
        <div class="row"><b>1:1 문의하기</b></div>
        </div><button class="btn-text" data-sh="close" style="margin-top:16px">닫기</button>`, { close: closeSheet });
    }
  }

  function openBox() {
    const care = [['water', '물방울', 'item-drop-24.svg'], ['heart', '마음', 'item-heart-24.svg'], ['sun', '햇빛', 'item-sun-24.svg']];
    const slots = [];
    care.forEach(([k, n, ic]) => slots.push(`<button class="slot${S[k] ? '' : ' empty-count'}" data-sh="use" data-k="${k}"><img src="${A(ic)}" alt=""><b class="cnt">${S[k]}</b><small>${n}</small></button>`));
    S.owned.forEach((id) => {
      const g = GOODS.find((x) => x.id === id); const on = S.placed.includes(id);
      slots.push(`<button class="slot deco-slot${on ? ' placed' : ''}" data-sh="deco" data-id="${id}"><img src="${A(g.img)}" alt=""><small>${g.name}</small>${on ? '<span class="badge">정원</span>' : ''}</button>`);
    });
    while (slots.length < 12 || slots.length % 4) slots.push('<span class="slot blank"></span>');
    openSheet(`<h3>보관함</h3><p class="sub">돌봄 아이템과 정원 소품이에요. 소품을 누르면 정원에 놓거나 넣을 수 있어요</p>
      <div class="box-grid">${slots.join('')}</div>
      <button class="btn-text" data-sh="close" style="margin-top:12px">닫기</button>`, {
      deco: (b) => {
        const id = b.dataset.id; const i = S.placed.indexOf(id);
        if (i >= 0) { S.placed.splice(i, 1); save(); toast('보관함에 넣었어요'); openBox(); }
        else { S.placed.push(id); save(); closeSheet(); go('home'); highlightDeco(id); toast('정원에 꺼내 놓았어요'); }
      },
      use: (b) => { closeSheet(); go('home'); setTimeout(() => useFromInventory(b.dataset.k), 420); },
      close: closeSheet,
    });
  }

  function openNick() {
    openSheet(`<h3>닉네임 바꾸기</h3><input class="nick-input" id="nickInput" maxlength="10" value="${S.nick}">
      <button class="btn btn-primary" data-sh="save">저장</button>`, {
      save: () => { S.nick = $('#nickInput').value.trim() || S.nick; save(); closeSheet(); renderMy(); },
    });
    setTimeout(() => $('#nickInput') && $('#nickInput').focus(), 400);
  }

  function openNoti() {
    const items = [];
    NEED_ORDER.forEach((k) => { if (S.quests[k] === false) items.push([QUESTS[k].icon.replace('-12', '-16').replace('ic-sun-16', 'ic-sun'), `${josa(S.plant.name, '이', '가')} ${MEANING[1][NEED_PATTERN[k]]} 상태예요`, QUESTS[k].hint]); });
    if (!S.records[S.today]) items.push(['ic-heart-16.svg', '오늘의 질문이 도착했어요', questionFor(S.today).q.replace('\n', ' ')]);
    openSheet(`<h3>알림</h3><div class="list">${items.length ? items.map(([ic, t, d]) => `<div class="row"><img src="${A(ic)}" width="16" height="16" alt=""><b>${t}<br><span>${d}</span></b></div>`).join('') : '<div class="row"><b>새 알림이 없어요</b></div>'}</div>
      <button class="btn-text" data-sh="close" style="margin-top:16px">닫기</button>`, { close: closeSheet });
  }

  /* ---------------- 진행 (다음 날 / 등장 / 초기화) ---------------- */
  function newDayQuests() {
    const pool = NEED_ORDER.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    const q = {}; NEED_ORDER.forEach((k) => { if (pool.includes(k)) q[k] = false; }); q.diary = false; return q;
  }
  function nextDay() {
    const d = parseISO(S.today); d.setDate(d.getDate() + 1);
    S.today = toISO(d);
    S.quests = newDayQuests();
    save();
    go('home', { force: true });
    setTimeout(() => Pot.event('morning'), 600);
    toast(`${d.getMonth() + 1}월 ${d.getDate()}일 아침이에요\n새 질문과 퀘스트가 도착했어요`);
  }
  function meet() {
    let rolled = false;
    if (!S.character) { S.charType = rollCharacter(); S.character = { name: CHARS[S.charType].name, xp: 0 }; rolled = true; }
    save();
    go('home');
    if (rolled && S.xpBank) { S.character.xp += S.xpBank; S.xpBank = 0; save(); }
    Char.sync(); Char.arrive(); checkLevel();
    setTimeout(() => toast(`${josa(CHARS[S.charType].name, '이', '가')} 정원에 왔어요\n물방울을 주면 함께 자라요`, 3000), 600);
  }

  /* ---------------- 이벤트 위임 ---------------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (b && phone.contains(b)) {
      const a = b.dataset.action;
      switch (a) {
        case 'go': go(b.dataset.to); break;
        case 'tab': go(b.dataset.to); break;
        case 'survey-next': surveyNext(); break;
        case 'survey-skip': surveyNext(); break;
        case 'survey-back': if (S.survey.step > 0) { S.survey.step--; renderSurvey(); } break;
        case 'scan': startScan(); break;
        case 'scan-close': stopScan(); break;
        case 'profile-done': profileDone(!!b.dataset.later); break;
        case 'open-diary': if (S.records[S.today] && current === 'home') go('calendar', { date: S.today }); else go('diary'); break;
        case 'toggle-quests': $('#questSheet').classList.toggle('open'); break;
        case 'diary-done': diaryDone(); break;
        case 'month': { const d = +b.dataset.d; let { y, m } = calView; m += d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } calView = { y, m }; renderCalendar(); break; }
        case 'meet': meet(); break;
        case 'buy': openGood(b.dataset.id); break;
        case 'menu': openMenu(b.dataset.m); break;
        case 'edit-nick': openNick(); break;
        case 'settings': openSheet(`<h3>설정</h3><div class="list"><button class="row" data-sh="nick"><b>닉네임 바꾸기</b></button><button class="row" data-sh="reset"><b style="color:#b2533e">프로토타입 처음부터 다시</b></button></div><button class="btn-text" data-sh="close" style="margin-top:16px">닫기</button>`, { nick: openNick, reset: reset, close: closeSheet }); break;
        case 'plant-info': go('profile'); break;
        case 'noti': openNoti(); break;
        case 'sheet-close': closeSheet(); break;
        default: break;
      }
      return;
    }
    const q = e.target.closest('.quest');
    if (q) {
      const k = q.dataset.q;
      if (S.quests[k]) toast('이미 완료한 퀘스트예요');
      else if (k === 'diary') go('diary');
      else toast(QUESTS[k].hint);
      return;
    }
    const chip = e.target.closest('.item-bar .item-chip');
    if (chip) {
      const it = chip.dataset.item;
      if (it === 'point') go('shop'); else useFromInventory(it);
    }
  });

  // 퀘스트 시트 드래그(위/아래 스와이프)
  (() => {
    const qs = $('#questSheet'); let y0 = null;
    qs.addEventListener('pointerdown', (e) => { y0 = e.clientY; });
    addEventListener('pointerup', (e) => {
      if (y0 == null) return; const dy = e.clientY - y0; y0 = null;
      if (dy < -30) qs.classList.add('open'); else if (dy > 30) qs.classList.remove('open');
    });
  })();

  /* ---------------- 프로토타입 컨트롤 ---------------- */
  function ensureOnboarded() {
    if (!S.onboarded) { S.onboarded = true; S.plant.name = S.plant.name || DEFAULT_PLANT_NAME; }
  }
  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    S = seedState(); Pot.force(0); applyTheme();
    $('#charWrap').hidden = true;
    go('survey', { force: true });
    devNote('처음부터 다시 시작해요');
  }
  let devNoteTimer;
  function devNote(msg) {
    const n = $('#devNote'); if (!n) return;
    n.textContent = msg; n.classList.add('on');
    clearTimeout(devNoteTimer); devNoteTimer = setTimeout(() => n.classList.remove('on'), 3200);
  }
  function renderDev() {
    if (typeof Pot === 'undefined') return;
    const n = Pot.needsNow();
    $$('#devNeeds button').forEach((b) => b.classList.toggle('need', !!n[b.dataset.care]));
    $$('#devLevels button').forEach((b) => b.classList.toggle('on', String(S.forcedLevel || 'auto') === b.dataset.level));
    $$('#devPatterns button').forEach((b) => b.classList.toggle('on', +b.dataset.pattern === Pot.forced));
    $$('#devTimes button').forEach((b) => b.classList.toggle('on', S.timeMode === b.dataset.time));
    const od = moodOdds().odds;
    $$('#devChars button').forEach((b) => {
      const k = b.dataset.char;
      b.classList.toggle('on', k === 'auto' ? !S.charOverride : S.charOverride === k);
      const pc = $('em', b); if (pc && od[k] != null) pc.textContent = `${Math.round(od[k] * 100)}%`;
    });
    const d = Pot.describe(Pot.expr());
    const l = S.character ? Char.lvl() : -1;
    const L = Pot.level();
    $('#devState').textContent = [
      `오늘: ${S.today}, ${THEMES[themeNow()].label}`,
      `화분 이해도: Level ${L} (${LEVEL_INFO[L][1]})${S.forcedLevel ? ' 고정' : ' 자동'}`,
      d ? `지금 파동: ${String(d.pattern).padStart(2, '0')} ${d.name}\n→ 의미: ${d.meaning} (Level ${d.level}, ${d.light})` : '지금 파동: 대기',
      `문답: ${Math.min(S.diaryCount, UNDERSTAND_GOAL)}/${UNDERSTAND_GOAL} → 새 식물 ${S.character ? '도착' : '대기'}`,
      S.character ? `캐릭터: Lv.${l + 1} ${LEVELS[l].name}, XP ${S.character.xp}` : '',
    ].filter(Boolean).join('\n');
  }
  setInterval(renderDev, 1000);
  const CARE_ACTIONS = {
    thirst: '물 주기', sun: '햇빛 쬐어주기', climate: '온습도 맞춰주기', nutrient: '영양제 넣어주기', air: '창문 열어 환기하기',
  };
  // 화분 센서 흉내: 시간이 지나면 화분이 새로운 돌봄을 원한다 → 퀘스트로 추가
  function raiseRandomNeed() {
    const free = NEED_ORDER.filter((k) => S.quests[k] !== false); if (!free.length) return;
    const k = free[Math.floor(Math.random() * free.length)];
    const q = {}; Object.keys(S.quests).filter((x) => x !== 'diary').forEach((x) => { q[x] = S.quests[x]; });
    q[k] = false; q.diary = S.quests.diary; S.quests = q;
    save(); if (current === 'home') renderQuests(); renderDev();
  }
  setInterval(() => {
    if (!S.onboarded || current !== 'home' || Pot.forced) return;
    const n = Pot.needsNow();
    if (!Object.values(n).some(Boolean) && Math.random() < 0.35) raiseRandomNeed();
  }, 45000);

  /* ---------------- 나를 닮은 식물: 마음 기록 비율 → 등장 확률 ---------------- */
  function moodOdds() {
    const cnt = { calm: 0, surprise: 0, worry: 0, angry: 0, sad: 0 };
    Object.values(S.records).forEach((r) => { if (r.mine && cnt[r.mood] != null) cnt[r.mood]++; });
    const total = Object.values(cnt).reduce((a, b) => a + b, 0);
    const odds = {};
    CHAR_ORDER.forEach((k) => { odds[k] = total ? cnt[k] / total : 0; });
    return { cnt, total, odds };
  }
  function rollCharacter() {
    if (S.charOverride) return S.charOverride;
    const { odds, total } = moodOdds();
    if (!total) return CHAR_ORDER[Math.floor(Math.random() * CHAR_ORDER.length)];
    let x = Math.random();
    for (const k of CHAR_ORDER) { x -= odds[k]; if (x <= 0) return k; }
    return 'calm';
  }
  function oddsHTML() {
    const { odds, total } = moodOdds();
    return `<div class="odds">${CHAR_ORDER.map((k) => `<div class="odds-row${S.character && S.charType === k ? ' on' : ''}">
      <img src="${A(CHARS[k].icon)}" alt=""><span class="odds-name">${CHARS[k].name}<small>${CHARS[k].label}</small></span>
      <span class="odds-bar"><i style="width:${Math.round(odds[k] * 100)}%;background:${CHAR_COLOR[k]}"></i></span><b>${Math.round(odds[k] * 100)}%</b></div>`).join('')}
      <p class="odds-note">지금까지 남긴 마음 기록 ${total}개를 바탕으로 해요</p></div>`;
  }

  $('.dev').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.care) { careAction(b.dataset.care); renderDev(); return; }
    if (b.dataset.level) {
      ensureOnboarded();
      S.forcedLevel = b.dataset.level === 'auto' ? null : +b.dataset.level; save();
      if (S.forcedLevel === 3 && Pot.forced === 4) Pot.force(0);
      if (current !== 'home') go('home');
      renderDev(); return;
    }
    if (b.dataset.pattern) {
      ensureOnboarded(); const p = +b.dataset.pattern;
      if (p === 4 && Pot.level() === 3) { devNote('Level 3에는 04번 표현이 없어요'); return; }
      Pot.force(p);
      if (current !== 'home') go('home');
      return;
    }
    if (b.dataset.char === 'auto') {
      S.charOverride = null; save(); renderDev(); devNote('마음 기록 비율로 캐릭터가 정해져요'); return;
    }
    if (b.dataset.char) {
      S.charOverride = b.dataset.char; S.charType = b.dataset.char;
      if (S.character && S.character.name && Object.values(CHARS).some((c) => c.name === S.character.name)) S.character.name = CHARS[S.charType].name;
      save(); renderDev();
      if (current === 'arrival') ENTER.arrival(); else if (current === 'my') renderMy();
      else if (current === 'home' && S.character) Char.jump();
      return;
    }
    if (b.dataset.time) { S.timeMode = b.dataset.time; save(); applyTheme(); renderDev(); return; }
    if (b.dataset.jump) {
      const to = b.dataset.jump;
      if (['home', 'diary', 'calendar', 'shop', 'my', 'arrival'].includes(to)) ensureOnboarded();
      if (to === 'survey') S.survey.step = 0;
      go(to, { force: true });
      return;
    }
    switch (b.dataset.dev) {
      case 'nextday': ensureOnboarded(); nextDay(); break;
      case 'arrive': ensureOnboarded(); S.diaryCount = Math.max(S.diaryCount, UNDERSTAND_GOAL); go('arrival', { force: true }); break;
      case 'xp':
        if (!S.character) { devNote('먼저 새 식물을 등장시켜주세요'); break; }
        if (current !== 'home') go('home');
        Char.grow(50); renderDev(); break;
      case 'points': S.points += 500; save(); renderItems(); if (current === 'shop') renderShop(); if (current === 'my') renderMy(); devNote('포인트 +500'); break;
      case 'reset': reset(); break;
      default: break;
    }
  });

  /* ---------------- 시작 ---------------- */
  // 자동 모드 버튼 추가
  applyTheme();
  $('#devChars').innerHTML = CHAR_ORDER.map((k) => `<button data-char="${k}" title="${CHARS[k].name}"><img src="${A(CHARS[k].icon)}" alt=""><span>${CHARS[k].label}</span><em></em></button>`).join('')
    + '<button data-char="auto" class="dev-auto">확률대로 (자동)</button>';
  const startScreen = S.onboarded ? (TAB_SCREENS.includes(S.screen) ? S.screen : 'home') : (['survey', 'search', 'profile'].includes(S.screen) ? S.screen : 'survey');
  go(startScreen, { force: true });
  renderDev();
})();
