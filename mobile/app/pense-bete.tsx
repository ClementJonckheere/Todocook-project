import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl, getHeaders } from "../src/lib/api";
import { colors } from "../src/theme/colors";

interface ShoppingItem {
  id: number;
  list_id: number;
  name: string;
  checked: boolean;
}

interface ShoppingList {
  id: number;
  title: string;
  items: ShoppingItem[];
  total_items: number;
  checked_items: number;
  updated_at: string;
}

export default function PenseBeteScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState("");
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const loadLists = async () => {
    try {
      const res = await fetch(apiUrl("/api/shopping-lists?userId=1"), { headers: getHeaders() });
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
        headers: getHeaders(),
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
    Alert.alert("Supprimer", "Supprimer cette liste ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(apiUrl(`/api/shopping-lists/${id}`), { method: "DELETE", headers: getHeaders() });
            setLists(lists.filter((l) => l.id !== id));
            if (selectedList?.id === id) setSelectedList(null);
          } catch (err) {
            console.error("Delete list error:", err);
          }
        },
      },
    ]);
  };

  const duplicateList = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`/api/shopping-lists/${id}/duplicate`), {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) {
        const newList = await res.json();
        setLists([newList, ...lists]);
      }
    } catch (err) {
      console.error("Duplicate list error:", err);
    }
  };

  const startEditingTitle = () => {
    if (selectedList) {
      setEditedTitle(selectedList.title);
      setIsEditingTitle(true);
    }
  };

  const updateListTitle = async () => {
    if (!selectedList || !editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    const newTitle = editedTitle.trim();
    if (newTitle === selectedList.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/shopping-lists/${selectedList.id}`), {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        const updatedList = { ...selectedList, title: newTitle, updated_at: new Date().toISOString() };
        setSelectedList(updatedList);
        setLists(moveListToTop(lists, updatedList));
      }
    } catch (err) {
      console.error("Update list title error:", err);
    }
    setIsEditingTitle(false);
  };

  const addItem = async () => {
    if (!selectedList || !newItemName.trim()) return;
    try {
      const res = await fetch(apiUrl(`/api/shopping-lists/${selectedList.id}/items`), {
        method: "POST",
        headers: getHeaders(),
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
        headers: getHeaders(),
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
        headers: getHeaders(),
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
        headers: getHeaders(),
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
        headers: getHeaders(),
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
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  // Detail view of a list
  if (selectedList) {
    const progress = getProgress(selectedList);
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => { setSelectedList(null); setIsEditingTitle(false); }} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
          <View style={s.headerTitle}>
            {isEditingTitle ? (
              <TextInput
                style={s.editTitleInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                onBlur={updateListTitle}
                onSubmitEditing={updateListTitle}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity onPress={startEditingTitle} activeOpacity={0.7}>
                <Text style={s.title}>{selectedList.title}</Text>
              </TouchableOpacity>
            )}
            <Text style={s.subtitle}>{selectedList.items.length} articles</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={uncheckAll} style={s.actionBtn}>
              <Ionicons name="refresh-outline" size={20} color={colors.gray[500]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={checkAll} style={s.actionBtn}>
              <Ionicons name="checkmark-done-outline" size={20} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar */}
        {selectedList.items.length > 0 && (
          <View style={s.progressContainer}>
            <View style={s.progressBg}>
              <View style={[s.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressText}>{progress}%</Text>
          </View>
        )}

        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          {/* Add item form */}
          <View style={s.addItemRow}>
            <TextInput
              style={s.addItemInput}
              placeholder="Ajouter un article..."
              value={newItemName}
              onChangeText={setNewItemName}
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Items list */}
          {selectedList.items.map((item) => (
            <View key={item.id} style={[s.itemCard, item.checked && s.itemChecked]}>
              <TouchableOpacity
                onPress={() => toggleItem(item.id, !item.checked)}
                style={s.checkboxArea}
              >
                <Ionicons
                  name={item.checked ? "checkmark-circle" : "ellipse-outline"}
                  size={26}
                  color={item.checked ? colors.primary[500] : colors.gray[300]}
                />
              </TouchableOpacity>
              <Text style={[s.itemName, item.checked && s.itemNameChecked]}>
                {item.name}
              </Text>
              <TouchableOpacity onPress={() => deleteItem(item.id)} style={s.deleteItemBtn}>
                <Ionicons name="close" size={18} color={colors.gray[400]} />
              </TouchableOpacity>
            </View>
          ))}

          {selectedList.items.length === 0 && (
            <Text style={s.emptyText}>Aucun article dans cette liste</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // List of all shopping lists
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.gray[600]} />
        </TouchableOpacity>
        <View style={s.headerTitle}>
          <Text style={s.title}>Pense-bête Courses</Text>
          <Text style={s.subtitle}>{lists.length} liste{lists.length > 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity
          style={s.addListBtn}
          onPress={() => setShowNewListForm(true)}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* New list form */}
        {showNewListForm && (
          <View style={s.newListCard}>
            <TextInput
              style={s.newListInput}
              placeholder="Nom de la liste..."
              value={newListTitle}
              onChangeText={setNewListTitle}
              autoFocus
              onSubmitEditing={createList}
            />
            <View style={s.newListActions}>
              <TouchableOpacity style={s.createBtn} onPress={createList}>
                <Text style={s.createBtnText}>Créer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => {
                  setShowNewListForm(false);
                  setNewListTitle("");
                }}
              >
                <Text style={s.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lists */}
        {lists.map((list) => {
          const progress = getProgress(list);
          return (
            <TouchableOpacity
              key={list.id}
              style={s.listCard}
              onPress={() => setSelectedList(list)}
              activeOpacity={0.7}
            >
              <View style={s.listHeader}>
                <View style={s.listInfo}>
                  <Text style={s.listTitle}>{list.title}</Text>
                  <Text style={s.listMeta}>
                    {list.total_items} article{Number(list.total_items) > 1 ? "s" : ""}
                    {Number(list.checked_items) > 0 &&
                      ` · ${list.checked_items} coché${Number(list.checked_items) > 1 ? "s" : ""}`}
                  </Text>
                </View>
                <View style={s.listActions}>
                  <TouchableOpacity
                    onPress={() => duplicateList(list.id)}
                    style={s.listActionBtn}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.gray[400]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteList(list.id)}
                    style={s.listActionBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.red[400]} />
                  </TouchableOpacity>
                </View>
              </View>
              {Number(list.total_items) > 0 && (
                <View style={s.listProgressBg}>
                  <View style={[s.listProgressBar, { width: `${progress}%` }]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {lists.length === 0 && !showNewListForm && (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>Aucune liste de courses</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => setShowNewListForm(true)}
            >
              <Text style={s.emptyBtnText}>Créer ma première liste</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1 },
  title: { fontSize: 18, fontWeight: "bold", color: colors.gray[900] },
  editTitleInput: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.gray[900],
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: -8,
    backgroundColor: colors.gray[100],
    borderRadius: 6,
    minWidth: 150,
  },
  subtitle: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 8 },
  addListBtn: {
    backgroundColor: colors.primary[500],
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.white },
  progressBg: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: colors.primary[500] },
  progressText: { fontSize: 10, color: colors.gray[400], textAlign: "right", marginTop: 4 },
  content: { flex: 1, padding: 16 },
  addItemRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  addItemInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  addItemBtn: {
    backgroundColor: colors.primary[500],
    width: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  itemChecked: { opacity: 0.6 },
  checkboxArea: { marginRight: 12 },
  itemName: { flex: 1, fontSize: 15, color: colors.gray[900] },
  itemNameChecked: { textDecorationLine: "line-through", color: colors.gray[400] },
  deleteItemBtn: { padding: 4 },
  emptyText: { textAlign: "center", color: colors.gray[400], marginTop: 40 },
  newListCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  newListInput: {
    backgroundColor: colors.gray[50],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: 12,
  },
  newListActions: { flexDirection: "row", gap: 10 },
  createBtn: {
    flex: 1,
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  createBtnText: { color: colors.white, fontWeight: "600" },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelBtnText: { color: colors.gray[500] },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  listHeader: { flexDirection: "row", justifyContent: "space-between" },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 16, fontWeight: "600", color: colors.gray[900] },
  listMeta: { fontSize: 11, color: colors.gray[400], marginTop: 4 },
  listActions: { flexDirection: "row", gap: 8 },
  listActionBtn: { padding: 4 },
  listProgressBg: {
    height: 4,
    backgroundColor: colors.gray[100],
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  listProgressBar: { height: "100%", backgroundColor: colors.primary[500] },
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyBtnText: { color: colors.white, fontWeight: "600" },
});
