const STORAGE_KEY = "questlist-state-v2";

const DIFFICULTY_XP = {
  easy: 10,
  medium: 20,
  hard: 35,
};

const CATEGORY_LABELS = {
  study: "Study",
  coding: "Coding",
  health: "Health",
  career: "Career",
};

const WEEKLY_CHALLENGE_POOL = [
  {
    id: "quests-8",
    title: "Quest Marathon",
    description: "Complete {target} quests this week.",
    metric: "completed-count",
    target: 8,
    rewardXp: 60,
  },
  {
    id: "xp-180",
    title: "XP Surge",
    description: "Earn {target} XP this week.",
    metric: "earned-xp",
    target: 180,
    rewardXp: 60,
  },
  {
    id: "hard-4",
    title: "Hard Mode",
    description: "Finish {target} hard quests this week.",
    metric: "hard-completed",
    target: 4,
    rewardXp: 70,
  },
  {
    id: "coding-5",
    title: "Code Sprint",
    description: "Complete {target} coding quests this week.",
    metric: "category-coding",
    target: 5,
    rewardXp: 65,
  },
];

const BADGE_DEFINITIONS = [
  {
    id: "first-quest",
    title: "First Blood",
    description: "Complete your first quest.",
    isUnlocked: (state) => state.completedTotal >= 1,
  },
  {
    id: "streak-3",
    title: "Momentum",
    description: "Reach a 3-day streak.",
    isUnlocked: (state) => state.streak >= 3,
  },
  {
    id: "streak-7",
    title: "Unstoppable",
    description: "Reach a 7-day streak.",
    isUnlocked: (state) => state.streak >= 7,
  },
  {
    id: "focused-5",
    title: "Focused Mind",
    description: "Complete 5 quests.",
    isUnlocked: (state) => state.completedTotal >= 5,
  },
  {
    id: "grinder-15",
    title: "Quest Grinder",
    description: "Complete 15 quests.",
    isUnlocked: (state) => state.completedTotal >= 15,
  },
  {
    id: "level-5",
    title: "Rising Star",
    description: "Reach level 5.",
    isUnlocked: (state) => state.level >= 5,
  },
  {
    id: "xp-500",
    title: "XP Hoarder",
    description: "Earn 500 total XP.",
    isUnlocked: (state) => state.xpTotal >= 500,
  },
  {
    id: "study-scholar",
    title: "Scholar",
    description: "Complete 5 study quests.",
    isUnlocked: (state) => getCompletedByCategory(state, "study") >= 5,
  },
  {
    id: "coding-smith",
    title: "Code Smith",
    description: "Complete 5 coding quests.",
    isUnlocked: (state) => getCompletedByCategory(state, "coding") >= 5,
  },
  {
    id: "health-keeper",
    title: "Vital Keeper",
    description: "Complete 4 health quests.",
    isUnlocked: (state) => getCompletedByCategory(state, "health") >= 4,
  },
  {
    id: "career-climber",
    title: "Career Climber",
    description: "Complete 3 career quests.",
    isUnlocked: (state) => getCompletedByCategory(state, "career") >= 3,
  },
];

const elements = {
  form: document.getElementById("task-form"),
  taskTitle: document.getElementById("task-title"),
  taskDifficulty: document.getElementById("task-difficulty"),
  taskCategory: document.getElementById("task-category"),
  taskList: document.getElementById("tasks"),
  emptyState: document.getElementById("empty-state"),
  clearDone: document.getElementById("clear-done"),
  taskTemplate: document.getElementById("task-item-template"),
  level: document.getElementById("level"),
  xp: document.getElementById("xp"),
  xpGoal: document.getElementById("xp-goal"),
  streak: document.getElementById("streak"),
  completedTotal: document.getElementById("completed-total"),
  progressPercent: document.getElementById("progress-percent"),
  progressFill: document.getElementById("progress-fill"),
  badgeList: document.getElementById("badge-list"),
  badgeCount: document.getElementById("badge-count"),
  weeklyTitle: document.getElementById("weekly-title"),
  weeklyDesc: document.getElementById("weekly-desc"),
  weeklyReward: document.getElementById("weekly-reward"),
  weeklyTrack: document.getElementById("weekly-track"),
  weeklyFill: document.getElementById("weekly-fill"),
  weeklyProgress: document.getElementById("weekly-progress"),
  exportProgress: document.getElementById("export-progress"),
  importProgress: document.getElementById("import-progress"),
  importFile: document.getElementById("import-file"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;
let state = loadState();

hydrateStateDerivedData();
saveState();
render();
bindEvents();

function createInitialState() {
  return {
    tasks: [],
    xpTotal: 0,
    completedTotal: 0,
    streak: 0,
    lastCompletedDate: null,
    unlockedBadgeIds: [],
    level: 1,
    weeklyChallenge: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }

    const parsed = JSON.parse(raw);
    return sanitizeImportedState(parsed);
  } catch {
    return createInitialState();
  }
}

function sanitizeImportedState(candidate) {
  const merged = {
    ...createInitialState(),
    ...(candidate && typeof candidate === "object" ? candidate : {}),
  };

  merged.tasks = Array.isArray(merged.tasks)
    ? merged.tasks.map(sanitizeTask).filter(Boolean)
    : [];

  merged.xpTotal = Number.isFinite(merged.xpTotal) ? Math.max(0, Math.floor(merged.xpTotal)) : 0;
  merged.completedTotal = Number.isFinite(merged.completedTotal)
    ? Math.max(0, Math.floor(merged.completedTotal))
    : 0;
  merged.streak = Number.isFinite(merged.streak) ? Math.max(0, Math.floor(merged.streak)) : 0;
  merged.lastCompletedDate = isValidDateStamp(merged.lastCompletedDate) ? merged.lastCompletedDate : null;
  merged.unlockedBadgeIds = Array.isArray(merged.unlockedBadgeIds)
    ? merged.unlockedBadgeIds.filter((id) => typeof id === "string")
    : [];

  merged.weeklyChallenge = sanitizeWeeklyChallenge(merged.weeklyChallenge);
  merged.level = getLevelFromXp(merged.xpTotal);

  return merged;
}

function sanitizeTask(task) {
  if (!task || typeof task !== "object") {
    return null;
  }

  const difficulty = DIFFICULTY_XP[task.difficulty] ? task.difficulty : "medium";
  const category = CATEGORY_LABELS[task.category] ? task.category : "study";

  return {
    id: typeof task.id === "string" && task.id ? task.id : crypto.randomUUID(),
    title: typeof task.title === "string" && task.title.trim() ? task.title.trim() : "Untitled quest",
    difficulty,
    category,
    xpValue: Number.isFinite(task.xpValue) ? Math.max(1, Math.floor(task.xpValue)) : DIFFICULTY_XP[difficulty],
    completed: Boolean(task.completed),
    createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
    completedAt: Number.isFinite(task.completedAt) ? task.completedAt : null,
  };
}

function sanitizeWeeklyChallenge(challenge) {
  if (!challenge || typeof challenge !== "object") {
    return null;
  }

  return {
    id: typeof challenge.id === "string" ? challenge.id : "",
    weekKey: typeof challenge.weekKey === "string" ? challenge.weekKey : "",
    metric: typeof challenge.metric === "string" ? challenge.metric : "completed-count",
    title: typeof challenge.title === "string" ? challenge.title : "Weekly Challenge",
    description: typeof challenge.description === "string" ? challenge.description : "",
    target: Number.isFinite(challenge.target) ? Math.max(1, Math.floor(challenge.target)) : 1,
    rewardXp: Number.isFinite(challenge.rewardXp) ? Math.max(1, Math.floor(challenge.rewardXp)) : 60,
    bonusGranted: Boolean(challenge.bonusGranted),
  };
}

function hydrateStateDerivedData() {
  state.level = getLevelFromXp(state.xpTotal);

  if (ensureCurrentWeekChallenge()) {
    saveState();
  }

  updateBadges();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.form.addEventListener("submit", onCreateTask);
  elements.taskList.addEventListener("change", onTaskToggle);
  elements.taskList.addEventListener("click", onTaskDelete);
  elements.clearDone.addEventListener("click", onClearCompleted);
  elements.exportProgress.addEventListener("click", onExportProgress);
  elements.importProgress.addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", onImportProgress);
}

function onCreateTask(event) {
  event.preventDefault();

  const title = elements.taskTitle.value.trim();
  const difficulty = elements.taskDifficulty.value;
  const category = elements.taskCategory.value;

  if (!title || !DIFFICULTY_XP[difficulty] || !CATEGORY_LABELS[category]) {
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title,
    difficulty,
    category,
    xpValue: DIFFICULTY_XP[difficulty],
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
  };

  state.tasks.unshift(task);
  saveAndRender();

  elements.form.reset();
  elements.taskDifficulty.value = "medium";
  elements.taskCategory.value = "study";
  showToast("Quest created. Time to earn some XP.");
}

function onTaskToggle(event) {
  const check = event.target;
  if (!check.classList.contains("task-check")) {
    return;
  }

  const taskId = check.dataset.taskId;
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  // Quests are one-way to prevent XP farming via check/uncheck loops.
  if (task.completed) {
    check.checked = true;
    return;
  }

  task.completed = true;
  task.completedAt = Date.now();
  state.xpTotal += task.xpValue;
  state.completedTotal += 1;

  const previousLevel = state.level;
  updateStreak();
  state.level = getLevelFromXp(state.xpTotal);

  const unlockedNow = updateBadges();
  const weeklyReward = maybeGrantWeeklyReward();
  saveAndRender();

  const levelUpCount = Math.max(0, state.level - previousLevel);
  const categoryLabel = CATEGORY_LABELS[task.category];
  showCompletionToast({
    xpGained: task.xpValue,
    levelUpCount,
    newBadgeCount: unlockedNow.length,
    extras: categoryLabel ? `${categoryLabel} quest` : "",
  });

  if (weeklyReward.granted) {
    showCompletionToast({
      xpGained: weeklyReward.rewardXp,
      levelUpCount: weeklyReward.levelUps,
      newBadgeCount: weeklyReward.badges,
      extras: "Weekly challenge complete",
    });
  }
}

function onTaskDelete(event) {
  if (!event.target.classList.contains("delete-btn")) {
    return;
  }

  const taskId = event.target.dataset.taskId;
  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  saveAndRender();
}

function onClearCompleted() {
  const before = state.tasks.length;
  state.tasks = state.tasks.filter((item) => !item.completed);
  const removedCount = before - state.tasks.length;

  if (removedCount > 0) {
    saveAndRender();
    showToast(`Cleared ${removedCount} completed quest${removedCount > 1 ? "s" : ""}.`);
  }
}

function onExportProgress() {
  const payload = {
    app: "QuestList",
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
  };

  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `questlist-export-${getDateStamp(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("Progress exported.");
}

async function onImportProgress(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const importedState = parsed && parsed.state ? parsed.state : parsed;

    state = sanitizeImportedState(importedState);
    hydrateStateDerivedData();
    saveAndRender();

    showToast("Progress imported successfully.");
  } catch {
    showToast("Import failed. Please use a valid QuestList JSON export.");
  } finally {
    event.target.value = "";
  }
}

function saveAndRender() {
  ensureCurrentWeekChallenge();
  saveState();
  render();
}

function render() {
  renderStats();
  renderWeeklyChallenge();
  renderTasks();
  renderBadges();
}

function renderStats() {
  const level = state.level;
  const levelFloorXp = getTotalXpToReachLevel(level);
  const currentGoal = getXpGoalForLevel(level);
  const currentProgressXp = state.xpTotal - levelFloorXp;
  const percent = Math.floor((currentProgressXp / currentGoal) * 100);

  elements.level.textContent = String(level);
  elements.xp.textContent = String(currentProgressXp);
  elements.xpGoal.textContent = String(currentGoal);
  elements.streak.textContent = String(state.streak);
  elements.completedTotal.textContent = String(state.completedTotal);
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;

  const track = elements.progressFill.parentElement;
  if (track) {
    track.setAttribute("aria-valuenow", String(percent));
  }
}

function renderWeeklyChallenge() {
  ensureCurrentWeekChallenge();
  const challenge = state.weeklyChallenge;
  const progress = getWeeklyProgress(challenge);
  const percent = Math.min(100, Math.floor((progress / challenge.target) * 100));

  elements.weeklyTitle.textContent = challenge.title;
  elements.weeklyDesc.textContent = challenge.description.replace("{target}", String(challenge.target));
  elements.weeklyReward.textContent = `+${challenge.rewardXp} XP reward`;
  elements.weeklyFill.style.width = `${percent}%`;
  elements.weeklyTrack.setAttribute("aria-valuenow", String(percent));
  elements.weeklyProgress.textContent = challenge.bonusGranted
    ? `Completed: ${progress}/${challenge.target}`
    : `Progress: ${progress}/${challenge.target}`;
}

function renderTasks() {
  elements.taskList.innerHTML = "";

  state.tasks.forEach((task) => {
    const node = elements.taskTemplate.content.firstElementChild.cloneNode(true);
    const check = node.querySelector(".task-check");
    const copy = node.querySelector(".task-copy");
    const meta = node.querySelector(".task-meta");
    const deleteBtn = node.querySelector(".delete-btn");

    check.dataset.taskId = task.id;
    check.checked = task.completed;
    check.disabled = task.completed;

    copy.textContent = task.title;
    meta.textContent = `${CATEGORY_LABELS[task.category]} | ${capitalize(task.difficulty)} | +${task.xpValue} XP${
      task.completed ? " | Completed" : ""
    }`;

    deleteBtn.dataset.taskId = task.id;

    if (task.completed) {
      node.classList.add("done");
    }

    elements.taskList.appendChild(node);
  });

  elements.emptyState.classList.toggle("hidden", state.tasks.length > 0);
}

function renderBadges() {
  const unlockedSet = new Set(state.unlockedBadgeIds);
  let unlockedCount = 0;

  elements.badgeList.innerHTML = "";

  BADGE_DEFINITIONS.forEach((badge) => {
    const unlocked = unlockedSet.has(badge.id);
    if (unlocked) {
      unlockedCount += 1;
    }

    const item = document.createElement("li");
    item.className = `badge-item${unlocked ? "" : " locked"}`;

    const title = document.createElement("p");
    title.className = "badge-title";
    title.textContent = badge.title;

    const desc = document.createElement("p");
    desc.className = "badge-desc";
    desc.textContent = badge.description;

    const status = document.createElement("p");
    status.className = "badge-state";
    status.textContent = unlocked ? "Unlocked" : "Locked";

    item.append(title, desc, status);
    elements.badgeList.appendChild(item);
  });

  elements.badgeCount.textContent = `${unlockedCount} unlocked`;
}

function updateStreak() {
  const today = getDateStamp(new Date());

  if (!state.lastCompletedDate) {
    state.streak = 1;
    state.lastCompletedDate = today;
    return;
  }

  if (state.lastCompletedDate === today) {
    return;
  }

  const lastDate = new Date(`${state.lastCompletedDate}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  const dayDiff = Math.round((todayDate - lastDate) / 86400000);

  state.streak = dayDiff === 1 ? state.streak + 1 : 1;
  state.lastCompletedDate = today;
}

function updateBadges() {
  const unlockedSet = new Set(state.unlockedBadgeIds);
  const newlyUnlocked = [];

  BADGE_DEFINITIONS.forEach((badge) => {
    if (!unlockedSet.has(badge.id) && badge.isUnlocked(state)) {
      unlockedSet.add(badge.id);
      newlyUnlocked.push(badge);
    }
  });

  state.unlockedBadgeIds = [...unlockedSet];
  return newlyUnlocked;
}

function maybeGrantWeeklyReward() {
  ensureCurrentWeekChallenge();
  const challenge = state.weeklyChallenge;
  const progress = getWeeklyProgress(challenge);

  if (challenge.bonusGranted || progress < challenge.target) {
    return { granted: false, rewardXp: 0, levelUps: 0, badges: 0 };
  }

  const previousLevel = state.level;
  challenge.bonusGranted = true;
  state.xpTotal += challenge.rewardXp;
  state.level = getLevelFromXp(state.xpTotal);

  const bonusBadges = updateBadges();

  return {
    granted: true,
    rewardXp: challenge.rewardXp,
    levelUps: Math.max(0, state.level - previousLevel),
    badges: bonusBadges.length,
  };
}

function ensureCurrentWeekChallenge() {
  const weekKey = getWeekKey(new Date());

  if (state.weeklyChallenge && state.weeklyChallenge.weekKey === weekKey) {
    return false;
  }

  state.weeklyChallenge = createChallengeForWeek(weekKey);
  return true;
}

function createChallengeForWeek(weekKey) {
  const seed = hashText(weekKey);
  const chosen = WEEKLY_CHALLENGE_POOL[seed % WEEKLY_CHALLENGE_POOL.length];

  return {
    id: chosen.id,
    weekKey,
    metric: chosen.metric,
    title: chosen.title,
    description: chosen.description,
    target: chosen.target,
    rewardXp: chosen.rewardXp,
    bonusGranted: false,
  };
}

function getWeeklyProgress(challenge) {
  const weekTasks = state.tasks.filter(
    (task) => task.completed && Number.isFinite(task.completedAt) && getWeekKey(new Date(task.completedAt)) === challenge.weekKey
  );

  if (challenge.metric === "completed-count") {
    return weekTasks.length;
  }

  if (challenge.metric === "earned-xp") {
    return weekTasks.reduce((sum, task) => sum + task.xpValue, 0);
  }

  if (challenge.metric === "hard-completed") {
    return weekTasks.filter((task) => task.difficulty === "hard").length;
  }

  if (challenge.metric === "category-coding") {
    return weekTasks.filter((task) => task.category === "coding").length;
  }

  return 0;
}

function getCompletedByCategory(currentState, category) {
  return currentState.tasks.filter((task) => task.completed && task.category === category).length;
}

function showCompletionToast({ xpGained, levelUpCount, newBadgeCount, extras }) {
  const parts = [`+${xpGained} XP`];

  if (levelUpCount > 0) {
    parts.push(`Level up x${levelUpCount}`);
  }

  if (newBadgeCount > 0) {
    parts.push(`${newBadgeCount} new badge${newBadgeCount > 1 ? "s" : ""}`);
  }

  if (extras) {
    parts.push(extras);
  }

  showToast(parts.join(" | "));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2500);
}

function getDateStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateStamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getWeekKey(date) {
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((current - yearStart) / 86400000 + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getXpGoalForLevel(level) {
  return 100 + (level - 1) * 35;
}

function getTotalXpToReachLevel(level) {
  let total = 0;
  for (let lv = 1; lv < level; lv += 1) {
    total += getXpGoalForLevel(lv);
  }
  return total;
}

function getLevelFromXp(totalXp) {
  let level = 1;
  let xpCursor = totalXp;

  while (xpCursor >= getXpGoalForLevel(level)) {
    xpCursor -= getXpGoalForLevel(level);
    level += 1;
  }

  return level;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
