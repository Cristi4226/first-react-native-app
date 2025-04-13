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
  Switch, // Sau poți folosi un Checkbox custom / Pressable
  Pressable, // Pentru butonul de ștergere
  KeyboardAvoidingView, // Util pt a ridica inputul deasupra tastaturii
  Platform, // Pentru KeyboardAvoidingView
  // StyleSheet, // Pentru definirea stilurilor
} from 'react-native';
import { supabase } from '../../src/lib/supabaseClient'; // Verifică din nou calea!
import { useAuth } from '../_layout'; // Adjusted path to match the correct location

// --- Definirea Tipului Todo ---
type Todo = {
  id: string;
  user_id: string;
  task_text: string;
  is_complete: boolean;
  created_at: string;
};

   // --- Definirea Stilurilor ---
  // Duplicate StyleSheet.create block removed.

// --- Componenta Reutilizabilă pentru un item din listă ---
// (Ideal ar fi să o muți într-un fișier separat ex: src/components/TodoItem.tsx)
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
      />
      <Text
        style={[
          styles.todoText,
          todo.is_complete ? styles.todoTextCompleted : {},
        ]}>
        {todo.task_text}
      </Text>
      <Pressable onPress={() => onDelete(todo.id)} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>✕</Text>
      </Pressable>
    </View>
  );
}
// --- Sfârșit Componentă TodoItem ---


// --- Ecranul Principal ---
export default function TodoListScreen() { // Am redenumit din HomeScreen
  const { session } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // --- Funcția de Fetch ---
  const fetchTodos = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data, error, status } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error && status !== 406) throw error;
      setTodos((data as Todo[]) ?? []); // Setează datele sau un array gol
    } catch (error: any) {
      Alert.alert('Error fetching todos', error.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // --- Efect pentru Fetch Inițial ---
  useEffect(() => {
    if (session) {
      fetchTodos();
    }
  }, [session, fetchTodos]);

  // --- Efect pentru Realtime ---
  useEffect(() => {
    if (!supabase || !session) return;

    const channel = supabase
      .channel(`todos_user_${session.user.id}`)
      .on<Todo>( // Specificăm tipul aici pentru payload
        'postgres_changes',
        {
          event: '*', // Ascultă INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Realtime change received:', payload.eventType, payload.new, payload.old);
          // Actualizare mai inteligentă (opțional, fetch e mai simplu)
          // if (payload.eventType === 'INSERT') {
          //   setTodos(currentTodos => [payload.new as Todo, ...currentTodos]);
          // } else if (payload.eventType === 'UPDATE') {
          //   setTodos(currentTodos => currentTodos.map(todo =>
          //       todo.id === payload.new.id ? (payload.new as Todo) : todo
          //   ));
          // } else if (payload.eventType === 'DELETE') {
          //    setTodos(currentTodos => currentTodos.filter(todo => todo.id !== payload.old.id));
          // }
          // Sau, mai simplu:
          fetchTodos();
        }
      )
     .subscribe(async (status) => {
         if (status === 'SUBSCRIBED') {
           console.log('Realtime channel subscribed!');
           // Poți face un fetch inițial și aici dacă vrei, după ce te-ai abonat
           // await fetchTodos();
         }
         // ... handle errors ...
       });


    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, session, fetchTodos]);

  // --- Funcția de Adăugare ---
  const handleAddTodo = async () => {
    if (newTaskText.trim() === '' || !session) return;
    setIsAdding(true);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { error } = await supabase
        .from('todos')
        .insert({ task_text: newTaskText.trim(), user_id: session.user.id });
      if (error) throw error;
      setNewTaskText('');
    } catch (error: any) {
      Alert.alert('Error adding todo', error.message);
    } finally {
      setIsAdding(false);
    }
  };

  // --- Funcția de Update ---
  const handleUpdateTodo = async (id: string, newStatus: boolean) => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: newStatus })
        .eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Error updating todo', error.message);
    }
  };

  // --- Funcția de Ștergere ---
  const handleDeleteTodo = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this task?", [
       { text: "Cancel", style: "cancel" },
       { text: "Delete", style: "destructive", onPress: async () => {
           try {
             if (!supabase) throw new Error("Supabase client not initialized");
             const { error } = await supabase.from('todos').delete().eq('id', id);
             if (error) throw error;
           } catch (error: any) { Alert.alert('Error deleting todo', error.message); }
         }
       }
    ]);
  };

   const handleLogout = async () => {
     try {
       if (!supabase) throw new Error("Supabase client not initialized");
       const { error } = await supabase.auth.signOut();
       if (error) throw error;
     } catch (error: any) {
       Alert.alert('Error logging out', error.message);
     }
   };

   // --- Definirea Stilurilor ---
   const styles = StyleSheet.create({
     todoItemContainer: {
       flexDirection: 'row',
       alignItems: 'center',
       padding: 10,
       borderBottomWidth: 1,
       borderBottomColor: '#ccc',
     },
     todoSwitch: {
       marginRight: 10,
     },
     todoText: {
       flex: 1,
       fontSize: 16,
     },
     todoTextCompleted: {
       textDecorationLine: 'line-through',
       color: '#888',
     },
     deleteButton: {
       backgroundColor: '#ff4d4d',
       padding: 5,
       borderRadius: 5,
     },
     deleteButtonText: {
       color: '#fff',
       fontWeight: 'bold',
     },
   });