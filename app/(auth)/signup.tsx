import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
// app/(auth)/signup.tsx - Linia 3

import { supabase } from '../../src/lib/supabaseClient'; // Corect: două ../ și include src
import { Link } from 'expo-router';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState(''); // Opțional
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // if (password !== confirmPassword) { // Validare opțională
    //   Alert.alert("Error", "Passwords do not match!");
    //   return;
    // }
    setLoading(true);
    if (!supabase) { /* ... handle error ... */ setLoading(false); return; }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else if (!data.session) {
       // Dacă ai confirmare email activată în Supabase, informează userul
       Alert.alert('Success', 'Please check your email to confirm your account!');
       // Poți naviga la login sau afișa un mesaj
    }
    // Dacă signUp returnează direct sesiune (confirmare email dezactivată),
    // onAuthStateChange din _layout se va ocupa de redirectare.

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {/* <TextInput placeholder="Confirm Password" ... /> */}
      <Button title={loading ? "Signing Up..." : "Sign Up"} onPress={handleSignUp} disabled={loading} />
      <Link href="../login" style={styles.link}>
        Already have an account? Login
      </Link>
    </View>
  );
}

// Adaugă stilurile similare cu cele din LoginScreen
const styles = StyleSheet.create({
   container: { flex: 1, justifyContent: 'center', padding: 20 },
   title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
   input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 5},
   link: { marginTop: 15, textAlign: 'center', color: 'blue' }
});