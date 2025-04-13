// app/(tabs)/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// --- Asigură-te că această cale este corectă! ---
import { supabase } from '../../src/lib/supabaseClient';
// --- Importă hook-ul din root layout ---
// --- Dacă ai exportat `useAuth` din app/_layout.tsx ---
import { useAuth } from '../_layout';

// --- Definirea Tipului Todo ---
type Todo = {
  id: string;
  user_id: string;
  task_text: string;
  is_complete: boolean;
  created_at: string;
};

// --- Componenta Reutilizabilă pentru un item din listă ---
// RECOMANDAT: Mută această componentă într-un fișier separat (ex: src/components/TodoItem.tsx)
// și import-o aici: import TodoItem from '../../components/TodoItem';
// ---
type TodoItemProps = {
  todo: Todo;
  onUpdate: (id: string, status: boolean) => void;
  onDelete: (id: string) => void;
};

function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  return (
    <View style={styles.todoItemContainer}>
      <Switch
        value={todo.is_complete}
        onValueChange={(newValue) => onUpdate(todo.id, newValue)}
        style={styles.todoSwitch}
        // Poți adăuga culori aici trackColor, thumbColor etc.
      />
      <Text
        style={[
          styles.todoText,
          todo.is_complete ? styles.todoTextCompleted : {},
        ]}>
        {todo.task_text}
      </Text>
      <Pressable onPress={() => onDelete(todo.id)} style={styles.deleteButton}>
        {/* Poți folosi o iconiță aici dacă vrei */}
        <Text style={styles.deleteButtonText}>✕</Text>
      </Pressable>
    </View>
  );
}
// --- Sfârșit Componentă TodoItem ---


// --- Ecranul Principal Todo List ---
export default function TodoListScreen() {
  // Probabil trebuie să obții sesiunea din contextul creat în root _layout
   const { session } = useAuth(); // Asigură-te că useAuth e exportat și importat corect

  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true); // Loading inițial
  const [isAdding, setIsAdding] = useState(false); // Loading pt adăugare

  // --- Funcția de Fetch ---
  const fetchTodos = useCallback(async () => {
    if (!session) {
        console.log("FetchTodos called without session, returning.");
        setTodos([]); // Golește lista dacă nu e sesiune
        setLoading(false);
        return;
    }
    console.log("Fetching todos for user:", session.user.id);
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data, error, status } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', session.user.id) // Filtrare explicită bună pt claritate
        .order('created_at', { ascending: false });

      if (error && status !== 406) throw error;
      console.log("Todos fetched:", data);
      setTodos((data as Todo[]) ?? []);
    } catch (error: any) {
      console.error("Error fetching todos:", error);
      Alert.alert('Error fetching todos', error.message);
    } finally {
      setLoading(false);
    }
  }, [session]); // Rulează din nou dacă sesiunea se schimbă

  // --- Efect pentru Fetch Inițial ---
  useEffect(() => {
    console.log("Session state changed in TodoListScreen:", session);
    fetchTodos(); // Încearcă fetch la montare sau când sesiunea devine disponibilă
  }, [session, fetchTodos]); // Re-rulează când sesiunea sau funcția fetch se schimbă

  // --- Efect pentru Realtime ---
  useEffect(() => {
    // Asigură-te că te abonezi doar o dată și doar dacă ai sesiune/client
    if (!supabase || !session) {
         console.log("Realtime effect skipped (no session or client).");
         return;
    }

    console.log("Setting up realtime subscription for user:", session.user.id);
    const channel = supabase
      .channel(`todos_user_${session.user.id}`)
      .on<Todo>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Realtime change received:', payload.eventType);
          // Re-fetch pentru simplitate
          fetchTodos();
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') { console.log('Realtime channel subscribed!'); }
         if (status === 'CHANNEL_ERROR') { console.error('Realtime channel error:', err); }
         if (status === 'TIMED_OUT') { console.warn('Realtime channel timed out'); }
       });

    // Cleanup la demontare
    return () => {
      console.log("Removing realtime channel subscription.");
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, session, fetchTodos]); // Depinde de client, sesiune și funcția fetch

  // --- Funcția de Adăugare ---
  const handleAddTodo = async () => {
    if (newTaskText.trim() === '' || !session) return;
    setIsAdding(true);
    console.log("Adding todo for user:", session.user.id);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { error } = await supabase
        .from('todos')
        .insert({ task_text: newTaskText.trim(), user_id: session.user.id });
      if (error) throw error;
      console.log("Todo added successfully");
      setNewTaskText('');
    } catch (error: any) {
       console.error("Error adding todo:", error);
      Alert.alert('Error adding todo', error.message);
    } finally {
      setIsAdding(false);
    }
  };

  // --- Funcția de Update ---
  const handleUpdateTodo = async (id: string, newStatus: boolean) => {
    console.log("Updating todo:", id, "to status:", newStatus);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: newStatus })
        .eq('id', id);
      if (error) throw error;
       console.log("Todo updated successfully");
    } catch (error: any) {
       console.error("Error updating todo:", error);
      Alert.alert('Error updating todo', error.message);
    }
  };

  // --- Funcția de Ștergere ---
  const handleDeleteTodo = async (id: string) => {
     console.log("Attempting to delete todo:", id);
    Alert.alert("Confirm Delete", "Are you sure you want to delete this task?", [
       { text: "Cancel", style: "cancel", onPress: () => console.log("Delete cancelled") },
       { text: "Delete", style: "destructive", onPress: async () => {
            console.log("Confirmed delete for todo:", id);
           try {
             if (!supabase) throw new Error("Supabase client not initialized");
             const { error } = await supabase.from('todos').delete().eq('id', id);
             if (error) throw error;
              console.log("Todo deleted successfully");
           } catch (error: any) {
              console.error("Error deleting todo:", error);
             Alert.alert('Error deleting todo', error.message);
           }
         }
       }
    ]);
  };

   // --- Funcția de Logout ---
   const handleLogout = async () => {
     if (!supabase) return;
     console.log("Logging out...");
     // Poți seta o stare globală de loading dacă vrei
     const { error } = await supabase.auth.signOut();
     if (error) {
       console.error("Logout error:", error);
       Alert.alert("Logout Error", error.message);
     } else {
        console.log("Logout successful");
        // Redirectarea e gestionată de _layout.tsx
     }
   };

  // --- JSX ---
  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // Ajustează offset
    >
      <Text style={styles.header}>My Tasks</Text>
      {/* Secțiunea de adăugare task */}
      <View style={styles.inputContainer}>
          <TextInput
              placeholder="Add a new task..."
              value={newTaskText}
              onChangeText={setNewTaskText}
              style={styles.input}
              onSubmitEditing={handleAddTodo} // Adaugă și din tastatură
              returnKeyType="done"
          />
          <Button title={isAdding ? "..." : "Add"} onPress={handleAddTodo} disabled={isAdding || newTaskText.trim() === ''} />
      </View>

      {/* Indicator de încărcare sau lista */}
      {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader}/>
      ) : (
          <FlatList
              data={todos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                  <TodoItem
                      todo={item}
                      onUpdate={handleUpdateTodo}
                      onDelete={handleDeleteTodo}
                  />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No tasks yet. Add one!</Text>}
              style={styles.list}
              // Poți adăuga un RefreshControl aici pentru pull-to-refresh
          />
      )}

      {/* Buton de Logout */}
      <View style={styles.footer}>
           <Button title="Logout" onPress={handleLogout} color="#FF3B30" />
      </View>
    </KeyboardAvoidingView>
  );
}

// --- Stiluri ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Fundal puțin diferit
  },
  header: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 20, // Spațiu de sus
      marginBottom: 15,
      textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 6,
    backgroundColor: 'white',
    fontSize: 16,
  },
  loader: {
      flex: 1, // Ocupă spațiul listei cât timp se încarcă
      justifyContent: 'center',
      alignItems: 'center',
  },
  list: {
      flex: 1, // Important pentru scroll
      paddingHorizontal: 15, // Spațiu lateral pt itemi
  },
  todoItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderRadius: 6,
    // Umbre subtile
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1, },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  todoSwitch: {
    marginRight: 12,
    // Transformare pt a face switch-ul puțin mai mic (opțional)
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  deleteButton: {
    paddingLeft: 12, // Spațiu înainte de buton
    paddingVertical: 5
  },
  deleteButtonText: {
    color: '#FF3B30', // Roșu iOS
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 60,
      fontSize: 16,
      color: '#888',
  },
  footer: {
      padding: 15,
      paddingBottom: 25, // Spațiu mai mare jos
      borderTopWidth: 1,
      borderTopColor: '#eee',
      backgroundColor: '#f8f8f8' // Fundal pt footer
  }
});