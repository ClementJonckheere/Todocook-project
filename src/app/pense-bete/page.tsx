"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  MoreVertical,
  ChevronLeft,
  X,
  RotateCcw,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import Link from "next/link";

interface ShoppingItem {
  id: number;
  list_id: number;
  name: string;
  checked: boolean;
  created_at: string;
}

interface ShoppingList {
  id: number;
  user_id: number;
  title: string;
  items: ShoppingItem[];
  total_items: number;
  checked_items: number;
  created_at: string;
  updated_at: string;
}

export default function PenseBetePage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState("");
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadLists = async () => {
    try {
      const res = await fetch(apiUrl("/api/shopping-lists?userId=1"));
      if (res.ok) {
        const data = await res.json();
        setLists(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Load lists error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLists();
  }, []);

  const createList = async () => {
    if (!newListTitle.trim()) return;
    try {
      const res = await fetch(apiUrl("/api/shopping-lists"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: 1, title: newListTitle.trim() }),
      });
      if (res.ok) {
        const newList = await res.json();
        setLists([newList, ...lists]);
        setNewListTitle("");
        setShowNewListForm(false);
      }
    } catch (err) {
      console.error("Create list error:", err);
    }
  };

  const deleteList = async (id: number) => {
    if (!confirm("Supprimer cette liste ?")) return;
    try {
      await fetch(apiUrl(`/api/shopping-lists/${id}`), { method: "DELETE" });
      setLists(lists.filter((l) => l.id !== id));
      if (selectedList?.id === id) setSelectedList(null);
    } catch (err) {
      console.error("Delete list error:", err);
    }
  };

  const duplicateList = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`/api/shopping-lists/${id}/duplicate`), {
        method: "POST",
      });
      if (res.ok) {
        const newList = await res.json();
        setLists([newList, ...lists]);
      }
    } catch (err) {
      console.error("Duplicate list error:", err);
    }
  };

  const updateTitle = async (id: number) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(apiUrl(`/api/shopping-lists/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      const updatedList = lists.find(l => l.id === id);
      if (updatedList) {
        const newList = { ...updatedList, title: editTitle.trim() };
        setLists(moveListToTop(lists, newList));
        if (selectedList?.id === id) {
          setSelectedList(newList);
        }
      }
      setEditingTitle(null);
    } catch (err) {
      console.error("Update title error:", err);
    }
  };

  const addItem = async () => {
    if (!selectedList || !newItemName.trim()) return;
    try {
      const res = await fetch(apiUrl(`/api/shopping-lists/${selectedList.id}/items`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newItemName.trim() }),
      });
      if (res.ok) {
        const newItem = await res.json();
        const updatedList = {
          ...selectedList,
          items: [...selectedList.items, newItem],
          total_items: selectedList.total_items + 1,
          updated_at: new Date().toISOString(),
        };
        setSelectedList(updatedList);
        setLists(moveListToTop(lists, updatedList));
        setNewItemName("");
      }
    } catch (err) {
      console.error("Add item error:", err);
    }
  };

  const toggleItem = async (itemId: number, checked: boolean) => {
    if (!selectedList) return;
    try {
      await fetch(apiUrl(`/api/shopping-lists/${selectedList.id}/items/${itemId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      const updatedItems = selectedList.items.map((item) =>
        item.id === itemId ? { ...item, checked } : item
      );
      const checkedCount = updatedItems.filter((i) => i.checked).length;
      const updatedList = {
        ...selectedList,
        items: updatedItems,
        checked_items: checkedCount,
        updated_at: new Date().toISOString(),
      };
      setSelectedList(updatedList);
      setLists(moveListToTop(lists, updatedList));
    } catch (err) {
      console.error("Toggle item error:", err);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!selectedList) return;
    try {
      await fetch(apiUrl(`/api/shopping-lists/${selectedList.id}/items/${itemId}`), {
        method: "DELETE",
      });
      const updatedItems = selectedList.items.filter((item) => item.id !== itemId);
      const checkedCount = updatedItems.filter((i) => i.checked).length;
      const updatedList = {
        ...selectedList,
        items: updatedItems,
        total_items: updatedItems.length,
        checked_items: checkedCount,
        updated_at: new Date().toISOString(),
      };
      setSelectedList(updatedList);
      setLists(moveListToTop(lists, updatedList));
    } catch (err) {
      console.error("Delete item error:", err);
    }
  };

  const checkAll = async () => {
    if (!selectedList) return;
    try {
      await fetch(apiUrl(`/api/shopping-lists/${selectedList.id}/check-all`), {
        method: "POST",
      });
      const updatedItems = selectedList.items.map((item) => ({ ...item, checked: true }));
      const updatedList = {
        ...selectedList,
        items: updatedItems,
        checked_items: updatedItems.length,
        updated_at: new Date().toISOString(),
      };
      setSelectedList(updatedList);
      setLists(moveListToTop(lists, updatedList));
    } catch (err) {
      console.error("Check all error:", err);
    }
  };

  const uncheckAll = async () => {
    if (!selectedList) return;
    try {
      await fetch(apiUrl(`/api/shopping-lists/${selectedList.id}/uncheck-all`), {
        method: "POST",
      });
      const updatedItems = selectedList.items.map((item) => ({ ...item, checked: false }));
      const updatedList = {
        ...selectedList,
        items: updatedItems,
        checked_items: 0,
        updated_at: new Date().toISOString(),
      };
      setSelectedList(updatedList);
      setLists(moveListToTop(lists, updatedList));
    } catch (err) {
      console.error("Uncheck all error:", err);
    }
  };

  const getProgress = (list: ShoppingList) => {
    if (list.total_items === 0) return 0;
    return Math.round((Number(list.checked_items) / Number(list.total_items)) * 100);
  };

  // Move a modified list to the top of the list (most recently used first)
  const moveListToTop = (allLists: ShoppingList[], updatedList: ShoppingList) => {
    return [updatedList, ...allLists.filter(l => l.id !== updatedList.id)];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Detail view of a list
  if (selectedList) {
    const progress = getProgress(selectedList);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
        <div className="bg-white dark:bg-gray-800 px-4 pt-12 pb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedList(null)}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex-1">
              {editingTitle === selectedList.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => updateTitle(selectedList.id)}
                  onKeyDown={(e) => e.key === "Enter" && updateTitle(selectedList.id)}
                  className="text-xl font-bold bg-transparent border-b-2 border-primary-500 focus:outline-none w-full dark:text-white"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer"
                  onClick={() => {
                    setEditTitle(selectedList.title);
                    setEditingTitle(selectedList.id);
                  }}
                >
                  {selectedList.title}
                </h1>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedList.items.length} articles
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={uncheckAll}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Tout décocher"
              >
                <RotateCcw className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={checkAll}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Tout cocher"
              >
                <CheckCircle2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {selectedList.items.length > 0 && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{progress}%</p>
            </div>
          )}
        </div>

        <div className="px-4 mt-4">
          {/* Add item form */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Ajouter un article..."
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <button
              onClick={addItem}
              className="bg-primary-500 text-white px-4 rounded-xl hover:bg-primary-600"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Items list */}
          <div className="space-y-2">
            {selectedList.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 ${
                  item.checked ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id, !item.checked)}
                  className="flex-shrink-0"
                >
                  {item.checked ? (
                    <CheckCircle2 className="w-6 h-6 text-primary-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}
                </button>
                <span
                  className={`flex-1 text-gray-900 dark:text-white ${
                    item.checked ? "line-through text-gray-400" : ""
                  }`}
                >
                  {item.name}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}

            {selectedList.items.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                Aucun article dans cette liste
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List of all shopping lists
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-white dark:bg-gray-800 px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Pense-bête Courses
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lists.length} liste{lists.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNewListForm(true)}
            className="bg-primary-500 text-white p-2 rounded-xl hover:bg-primary-600"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* New list form */}
      {showNewListForm && (
        <div className="px-4 mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <input
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="Nom de la liste..."
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white mb-3"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createList()}
            />
            <div className="flex gap-2">
              <button
                onClick={createList}
                className="flex-1 bg-primary-500 text-white py-2 rounded-lg text-sm font-medium"
              >
                Créer
              </button>
              <button
                onClick={() => {
                  setShowNewListForm(false);
                  setNewListTitle("");
                }}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="px-4 mt-4 space-y-3">
        {lists.map((list) => {
          const progress = getProgress(list);
          return (
            <div
              key={list.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setSelectedList(list)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {list.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {list.total_items} article{Number(list.total_items) > 1 ? "s" : ""}
                      {Number(list.checked_items) > 0 &&
                        ` · ${list.checked_items} coché${Number(list.checked_items) > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === list.id ? null : list.id);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === list.id && (
                      <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateList(list.id);
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" /> Dupliquer
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteList(list.id);
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {Number(list.total_items) > 0 && (
                  <div className="mt-3">
                    <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {lists.length === 0 && !showNewListForm && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Aucune liste de courses</p>
            <button
              onClick={() => setShowNewListForm(true)}
              className="bg-primary-500 text-white px-6 py-2 rounded-xl text-sm font-medium"
            >
              Créer ma première liste
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
