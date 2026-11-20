const screen = document.querySelector("#screen");
const letters = "ABCD";
let mode, active, answers, index, missed;

function element(tag, text, className) {
  const item = document.createElement(tag);
  item.textContent = text ?? "";
  if (className) item.className = className;
  return item;
}
function button(text, className, action) {
  const item = element("button", text, className);
  item.addEventListener("click", action);
  return item;
}
function focusHeading(item) {
  item.tabIndex = -1;
  item.focus({preventScroll:true});
  window.scrollTo(0, 0);
}
function showHome() {
  window.speechSynthesis?.cancel();
  screen.replaceChildren(document.querySelector("#landing").content.cloneNode(true));
  screen.querySelectorAll("[data-mode]").forEach(item => {
    item.addEventListener("click", () => start(item.dataset.mode));
  });
}
function start(selected, retry) {
  mode = selected;
  active = retry ?? bank.filter(question => selected === "綜合" || question[0] === selected);
  answers = Array(active.length).fill(null);
  index = 0;
  showQuestion();
}
function showQuestion() {
  window.speechSynthesis?.cancel();
  const [category, prompt, options, , , material] = active[index];
  const done = answers.filter(answer => answer !== null).length;
  const panel = element("section", null, "panel");
  const top = element("div", null, "row");
  top.append(element("h1", mode === "綜合" ? "綜合測驗" : mode + "練習"), element("span", "已答 " + done + " / " + active.length, "muted"));
  const progress = element("progress");
  progress.max = active.length;
  progress.value = done;
  progress.setAttribute("aria-label", "作答進度");
  panel.append(top, progress, element("p", category + " · 第 " + (index + 1) + " 題", "eyebrow"));
  if (category === "閱讀") {
    const passage = element("div", null, "passage");
    passage.lang = "en";
    passage.append(element("strong", reading[material][0]), element("p", reading[material][1]));
    panel.append(passage);
  }
  const heading = element("h2", prompt);
  heading.lang = "en";
  panel.append(heading);
  if (category === "聽力") {
    const status = element("p", null, "notice");
    status.setAttribute("role", "status");
    const play = button("播放英語語音", "secondary audio", () => {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        status.textContent = "這個瀏覽器無法播放語音。可在交卷後查看聽力逐字稿。";
        return;
      }
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(material + " " + prompt);
      speech.lang = "en-US";
      speech.rate = 0.85;
      speech.onerror = event => {
        if (!["canceled", "interrupted"].includes(event.error)) status.textContent = "語音播放失敗，請確認裝置已啟用英語語音。";
      };
      status.textContent = "";
      window.speechSynthesis.speak(speech);
    });
    panel.append(play, status);
  }
  const choices = element("div", null, "options");
  options.forEach((option, i) => {
    const item = button("", "option", () => {
      answers[index] = i;
      showQuestion();
      screen.querySelectorAll(".option")[i].focus({preventScroll:true});
    });
    item.lang = "en";
    item.setAttribute("aria-pressed", answers[index] === i);
    item.append(element("span", letters[i], "letter"), element("span", option));
    choices.append(item);
  });
  panel.append(choices);
  const nav = element("div", null, "row nav");
  const prev = button("上一題", "secondary", () => { index--; showQuestion(); });
  prev.disabled = index === 0;
  const submit = () => {
    if (done === active.length || window.confirm("還有 " + (active.length - done) + " 題未答。確定交卷？")) showResults();
  };
  const next = index === active.length - 1
    ? button("交卷看解析", "primary", submit)
    : button("下一題", "primary", () => { index++; showQuestion(); });
  nav.append(prev);
  if (index < active.length - 1) nav.append(button("交卷", "secondary", submit));
  nav.append(next);
  panel.append(nav);
  const numbers = element("nav", null, "numbers");
  numbers.setAttribute("aria-label", "跳至指定題目");
  active.forEach((_, i) => {
    const item = button(i + 1, answers[i] === null ? "" : "answered", () => { index = i; showQuestion(); });
    item.setAttribute("aria-label", "第 " + (i + 1) + " 題，" + (answers[i] === null ? "未答" : "已答"));
    if (index === i) item.setAttribute("aria-current", "true");
    numbers.append(item);
  });
  panel.append(numbers);
  screen.replaceChildren(panel);
  focusHeading(heading);
}
function showResults() {
  window.speechSynthesis?.cancel();
  const tally = {};
  missed = [];
  active.forEach((question, i) => {
    const category = question[0];
    tally[category] ??= [0, 0];
    tally[category][1]++;
    if (answers[i] === question[3]) tally[category][0]++;
    else missed.push(question);
  });
  const panel = element("section", null, "panel");
  const heading = element("h1", "測驗結果");
  panel.append(heading, element("p", Math.round((active.length - missed.length) * 100 / active.length) + " 分", "score"),
    element("p", "答對 " + (active.length - missed.length) + " / " + active.length + " 題，未答 " + answers.filter(answer => answer === null).length + " 題"));
  const breakdown = element("div", null, "breakdown");
  Object.entries(tally).forEach(([category, [right, total]]) => breakdown.append(element("span", category + " " + right + " / " + total)));
  const actions = element("div", null, "row");
  actions.append(button("回首頁", "secondary", showHome), button("重新練習", "secondary", () => start(mode)));
  if (missed.length) actions.append(button("重練答錯與未答題", "primary", () => start(mode, missed)));
  panel.append(breakdown, actions, element("h2", "逐題解析"));
  active.forEach(([category, prompt, options, correct, explanation, material], i) => {
    const answer = answers[i];
    const detail = element("details", null, "review");
    detail.open = answer !== correct;
    const summary = element("summary", (i + 1) + ". " + (answer === correct ? "答對" : answer === null ? "未答" : "答錯") + " · " + category);
    const question = element("p", prompt);
    question.lang = "en";
    detail.append(summary, question,
      element("p", "你的答案　" + (answer === null ? "未作答" : letters[answer] + ". " + options[answer])),
      element("p", "正確答案　" + letters[correct] + ". " + options[correct]), element("p", explanation));
    if (category === "聽力") detail.append(element("p", "聽力逐字稿　" + material, "passage"));
    if (category === "閱讀") detail.append(element("p", reading[material][1], "passage"));
    panel.append(detail);
  });
  screen.replaceChildren(panel);
  focusHeading(heading);
}
document.querySelector("#home").addEventListener("click", () => {
  if (screen.querySelector("progress") && answers.some(answer => answer !== null) && !window.confirm("返回首頁會結束本次作答。確定返回？")) return;
  showHome();
});
showHome();
