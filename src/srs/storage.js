// Persistence tiến độ SR vào localStorage. Source of truth: spec §1.5 (constraint C4).
// Key có version để migrate an toàn về sau.

export const KEY = "phrasal-srs-v1";

// map dạng { [id]: SRstate }
export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function saveProgress(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* localStorage đầy/không khả dụng — bỏ qua, không làm vỡ app */
  }
}

export function resetProgress() {
  localStorage.removeItem(KEY);
}
