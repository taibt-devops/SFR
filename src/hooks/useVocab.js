// State + persistence cho từ vựng: gộp built-in + từ user; thêm/xoá/import/export.
// Logic thuần ở vocabStore.js; hook này chỉ giữ state React + lưu localStorage.
import { useCallback, useMemo, useState } from "react";
import builtin from "../data/vocab.js";
import {
  loadUserVocab,
  saveUserVocab,
  mergeVocab,
  normalizeEntry,
  parseImport,
  classifyImport,
  upsertUser,
  exportUser,
  withId,
} from "../srs/vocabStore.js";

export function useVocab() {
  const [userRaw, setUserRaw] = useState(loadUserVocab);

  const vocab = useMemo(() => mergeVocab(builtin, userRaw), [userRaw]);
  const existingIds = useMemo(() => new Set(vocab.map((c) => c.id)), [vocab]);

  const persist = useCallback((list) => {
    setUserRaw(list);
    saveUserVocab(list);
  }, []);

  // Thêm/sửa 1 từ. Trả {ok, error?, duplicate?}.
  const addWord = useCallback(
    (entry) => {
      const n = normalizeEntry(entry);
      if (!n) return { ok: false, error: "Cần ít nhất Chủ đề (c) và Từ (v)" };
      const duplicate = existingIds.has(withId(n).id);
      persist(upsertUser(userRaw, [n]));
      return { ok: true, duplicate };
    },
    [userRaw, existingIds, persist]
  );

  // Import mảng JSON (dán hoặc từ file). Trả {ok, error?} hoặc {ok, added, duplicate, invalid}.
  const importText = useCallback(
    (text) => {
      const res = parseImport(text);
      if (!res.ok) return res;
      const { added, duplicate } = classifyImport(res.valid, existingIds);
      persist(upsertUser(userRaw, res.valid));
      return { ok: true, added, duplicate, invalid: res.invalid };
    },
    [userRaw, existingIds, persist]
  );

  const removeWord = useCallback(
    (id) => persist(userRaw.filter((r) => withId(r).id !== id)),
    [userRaw, persist]
  );

  const exportText = useCallback(() => exportUser(userRaw), [userRaw]);

  return {
    vocab, // built-in + user (đã có id), dùng cho học
    userWords: useMemo(() => userRaw.map(withId), [userRaw]), // chỉ từ user, để liệt kê/xoá
    addWord,
    importText,
    removeWord,
    exportText,
  };
}
