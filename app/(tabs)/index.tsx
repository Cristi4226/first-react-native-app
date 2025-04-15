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
  SafeAreaView
} from 'react-native';
import { supabase } from '../../src/lib/supabaseClient';
import { useAuth } from '../_layout';

type Todo = {
  id: string;
  user_id: string;
  task_text: string;
  is_complete: boolean;
  created_at: string;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#888',
  },
  todoItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 8,
  },
  todoSwitch: {
    marginRight: 10,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
  },
  todoTextContainer: {
      flex: 1,
      marginRight: 10,
  },
  todoText: {
    fontSize: 16,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#ff4d4d',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

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
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={todo.is_complete ? "#f4f3f4" : "#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
      />
      <View style={styles.todoTextContainer}>
        <Text
          style={[
            styles.todoText,
            todo.is_complete ? styles.todoTextCompleted : {},
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
          >
          {todo.task_text}
        </Text>
      </View>
      <Pressable onPress={() => onDelete(todo.id)} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function TodoListScreen() {
  const { session } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const fetchTodos = useCallback(async () => {
    if (!session) {
      setTodos([]);
      setLoading(false);
      return;
    }
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data, error, status } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error && status !== 406) throw error;
      setTodos((data as Todo[]) ?? []);
    } catch (error: any) {
      Alert.alert('Error fetching todos', error.message);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      setLoading(true);
      fetchTodos();
    } else {
      setLoading(false);
      setTodos([]);
    }
  }, [session, fetchTodos]);

  useEffect(() => {
    if (!supabase || !session) {
        return;
    }

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
          fetchTodos();
        }
      )
      .subscribe(async (status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('Realtime channel subscribed successfully!');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.error('Realtime subscription error or closed:', status, err);
              Alert.alert('Realtime Connection Error', `Could not connect to live updates. Status: ${status} ${err ? err.message : ''}`);
            }
       });

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, session, fetchTodos]);

  const handleAddTodo = async () => {
    if (newTaskText.trim() === '' || !session || isAdding) return;

    setIsAdding(true);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const taskToAdd = newTaskText.trim();
      const { error } = await supabase
        .from('todos')
        .insert({ task_text: taskToAdd, user_id: session.user.id, is_complete: false });

      if (error) throw error;
      setNewTaskText('');
    } catch (error: any) {
      console.error('Error adding todo:', error);
      Alert.alert('Error adding todo', error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateTodo = async (id: string, newStatus: boolean) => {
     setTodos(currentTodos =>
        currentTodos.map(todo =>
            todo.id === id ? { ...todo, is_complete: newStatus } : todo
        )
     );

    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: newStatus })
        .eq('id', id)
        .eq('user_id', session?.user?.id);

      if (error) {
          setTodos(currentTodos =>
            currentTodos.map(todo =>
                todo.id === id ? { ...todo, is_complete: !newStatus } : todo
            )
         );
         throw error;
      }
    } catch (error: any) {
      console.error('Error updating todo:', error);
      Alert.alert('Error updating todo', error.message);
    }
  };

  const handleDeleteTodo = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const originalTodos = [...todos];
            setTodos(currentTodos => currentTodos.filter(todo => todo.id !== id));

            try {
              if (!supabase) throw new Error("Supabase client not initialized");
              const { error } = await supabase
                .from('todos')
                .delete()
                .eq('id', id)
                .eq('user_id', session?.user?.id);

              if (error) {
                  setTodos(originalTodos);
                  throw error;
              }
            } catch (error: any) {
              console.error('Error deleting todo:', error);
              setTodos(originalTodos); // Ensure rollback on catch as well
              Alert.alert('Error deleting todo', error.message);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const handleLogout = async () => {
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Navigation logic should be triggered by session change in _layout.tsx
    } catch (error: any) {
      console.error('Error logging out:', error);
      Alert.alert('Error logging out', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>My Tasks</Text>
                <Button title="Logout" onPress={handleLogout} color="#ff4d4d" />
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a new task..."
                    value={newTaskText}
                    onChangeText={setNewTaskText}
                    onSubmitEditing={handleAddTodo}
                    returnKeyType="done"
                    editable={!isAdding}
                />
                {isAdding ? (
                    <ActivityIndicator size="small" color="#007bff" />
                ) : (
                    <Button
                        title="Add"
                        onPress={handleAddTodo}
                        disabled={newTaskText.trim() === '' || isAdding}
                    />
                )}
            </View>

            <View style={styles.listContainer}>
                {loading ? (
                    <ActivityIndicator size="large" color="#007bff" style={styles.loadingIndicator} />
                ) : todos.length === 0 ? (
                    <Text style={styles.emptyListText}>No tasks yet. Add one!</Text>
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
                    />
                )}
            </View>

        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}