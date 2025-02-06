import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFonts } from 'expo-font';
import AppLoading from 'expo-app-loading';
import LottieView from 'lottie-react-native';

export default function App() {
  // Preset categories for the picker dropdown
  const presetCategories = ['General', 'Health', 'Work', 'Education', 'Finance'];

  const [habits, setHabits] = useState([]);
  const [input, setInput] = useState('');
  // Instead of text input for category, we use a picker. Default is "General"
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [showAnimation, setShowAnimation] = useState(false);

  // States for editing a habit
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState(null);
  const [editInput, setEditInput] = useState('');
  const [editCategory, setEditCategory] = useState('General');

  // States for habit details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [habitForDetails, setHabitForDetails] = useState(null);
  const [manualDateInput, setManualDateInput] = useState('');

  // Filter state: now a category string selected via buttons
  const [filterCategory, setFilterCategory] = useState('');

  const lottieRef = useRef(null);

  let [fontsLoaded] = useFonts({
    PixelFont: require('./assets/fonts/PixelFont.ttf'),
  });

  if (!fontsLoaded) {
    return <AppLoading />;
  }

  // Add a new habit using the title input and the selected category from the picker
  const addHabit = () => {
    if (input.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const newHabit = {
        key: Date.now().toString(),
        title: input,
        category: selectedCategory,
        completedToday: false,
        streak: 0,
        history: [],
      };
      setHabits([...habits, newHabit]);
      setInput('');
      setSelectedCategory('General');
    }
  };

  // Toggle completion status of a habit for today
  const toggleComplete = (habitKey) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.key === habitKey) {
          if (!habit.completedToday) {
            const today = new Date().toISOString().split('T')[0];
            const lastCompletion = habit.history[0];
            let newStreak = habit.streak;
            if (lastCompletion) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              newStreak = lastCompletion === yesterdayStr ? habit.streak + 1 : 1;
            } else {
              newStreak = 1;
            }
            setShowAnimation(true);
            setTimeout(() => setShowAnimation(false), 1500);
            return {
              ...habit,
              completedToday: true,
              streak: newStreak,
              history: [today, ...habit.history],
            };
          } else {
            return habit;
          }
        }
        return habit;
      })
    );
  };

  // Delete a habit with confirmation
  const deleteHabit = (habitKey) => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setHabits((prevHabits) =>
            prevHabits.filter((habit) => habit.key !== habitKey)
          ),
      },
    ]);
  };

  // Open the edit modal and prefill habit data
  const openEditModal = (habit) => {
    setHabitToEdit(habit);
    setEditInput(habit.title);
    setEditCategory(habit.category);
    setEditModalVisible(true);
  };

  // Save the edited habit info
  const saveEdit = () => {
    if (editInput.trim()) {
      setHabits((prevHabits) =>
        prevHabits.map((habit) =>
          habit.key === habitToEdit.key
            ? { ...habit, title: editInput, category: editCategory }
            : habit
        )
      );
      setEditModalVisible(false);
      setHabitToEdit(null);
      setEditInput('');
      setEditCategory('General');
    }
  };

  // Open details modal
  const openDetailsModal = (habit) => {
    setHabitForDetails(habit);
    setManualDateInput('');
    setDetailsModalVisible(true);
  };

  // Mark a manual completion for a specified date
  const markManualCompletion = () => {
    if (!manualDateInput.trim()) return;
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.key === habitForDetails.key) {
          if (!habit.history.includes(manualDateInput)) {
            return {
              ...habit,
              history: [manualDateInput, ...habit.history],
            };
          }
        }
        return habit;
      })
    );
    Alert.alert('Success', 'Manual completion added!');
    setManualDateInput('');
  };

  // Reset the streak of a habit
  const resetStreak = (habit) => {
    Alert.alert(
      'Reset Streak',
      'Are you sure you want to reset the streak?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () =>
            setHabits((prevHabits) =>
              prevHabits.map((h) =>
                h.key === habit.key ? { ...h, streak: 0 } : h
              )
            ),
        },
      ]
    );
  };

  // Get a list of unique categories from the habits
  const getUniqueCategories = () => {
    const categories = habits.map((h) => h.category);
    return Array.from(new Set(categories));
  };

  // Render a habit item with organized layout
  const renderHabit = ({ item }) => {
    // Only show habits that match the selected filter (if any)
    if (filterCategory && item.category.toLowerCase() !== filterCategory.toLowerCase()) {
      return null;
    }
    return (
      <View style={styles.habitItem}>
        {/* Header row: Habit title and category */}
        <View style={styles.habitHeader}>
          <Text style={styles.habitText}>{item.title}</Text>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        {/* Buttons row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => openDetailsModal(item)} style={styles.habitButton}>
            <Text style={styles.buttonTextSmall}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.habitButton}>
            <Text style={styles.buttonTextSmall}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteHabit(item.key)} style={styles.habitButton}>
            <Text style={styles.buttonTextSmall}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.habitButton,
              item.completedToday && styles.completedButton,
            ]}
            onPress={() => toggleComplete(item.key)}
          >
            <Text style={styles.buttonTextSmall}>
              {item.completedToday ? 'Done' : 'Mark Done'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Streak info */}
        <View style={styles.streakRow}>
          <Text style={styles.infoText}>Streak: {item.streak}</Text>
        </View>
      </View>
    );
  };

  // Filter the habits list based on the selected category
  const filteredHabits = habits.filter((habit) =>
    filterCategory ? habit.category.toLowerCase() === filterCategory.toLowerCase() : true
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habit Tracker</Text>

      {/* New Habit Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          placeholder="Habit Title"
          placeholderTextColor="#ccc"
          onChangeText={setInput}
        />
      </View>
      <View style={styles.inputContainer}>
        {/* Picker for preset categories */}
        <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCategory}
          style={styles.picker}
          itemStyle={styles.pickerItem} // This sets the style for the dropdown items
          onValueChange={(itemValue) => setSelectedCategory(itemValue)}
        >
          {presetCategories.map((cat) => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>

        </View>
        <TouchableOpacity style={styles.addButton} onPress={addHabit}>
          <Text style={styles.buttonText}>Add Habit</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterCategory === '' && styles.activeFilterButton,
            ]}
            onPress={() => setFilterCategory('')}
          >
            <Text style={styles.filterButtonText}>All</Text>
          </TouchableOpacity>
          {getUniqueCategories().map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterButton,
                filterCategory.toLowerCase() === cat.toLowerCase() && styles.activeFilterButton,
              ]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={styles.filterButtonText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Habits List */}
      <FlatList
        data={filteredHabits}
        renderItem={renderHabit}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={<Text style={styles.emptyText}>No habits yet. Add one!</Text>}
      />

      {/* Completion Animation */}
      {showAnimation && (
        <View style={styles.animationContainer}>
          <LottieView
            ref={lottieRef}
            source={require('./assets/animations/habit.json')}
            autoPlay
            loop={false}
            style={styles.lottie}
          />
        </View>
      )}

      {/* Edit Habit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Habit</Text>
            <TextInput
              style={styles.input}
              value={editInput}
              onChangeText={setEditInput}
              placeholder="Habit Title"
              placeholderTextColor="#ccc"
            />
            {/* Picker for editing category */}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editCategory}
                style={styles.picker}
                onValueChange={(itemValue) => setEditCategory(itemValue)}
              >
                {presetCategories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={saveEdit}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#d32f2f' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Habit Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {habitForDetails && (
              <>
                <Text style={styles.modalTitle}>Habit Details</Text>
                <Text style={styles.habitText}>{habitForDetails.title}</Text>
                <Text style={styles.infoText}>Category: {habitForDetails.category}</Text>
                <Text style={styles.infoText}>Current Streak: {habitForDetails.streak}</Text>
                <Text style={[styles.infoText, { marginTop: 10 }]}>Completion History:</Text>
                {habitForDetails.history.length > 0 ? (
                  <FlatList
                    data={habitForDetails.history}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <Text style={styles.infoText}>• {item}</Text>
                    )}
                  />
                ) : (
                  <Text style={styles.infoText}>No completions yet.</Text>
                )}
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  value={manualDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#ccc"
                  onChangeText={setManualDateInput}
                />
                <TouchableOpacity style={styles.addButton} onPress={markManualCompletion}>
                  <Text style={styles.buttonText}>Mark Manual Completion</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: '#ff5722', marginTop: 10 }]}
                  onPress={() => resetStreak(habitForDetails)}
                >
                  <Text style={styles.buttonText}>Reset Streak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { marginTop: 15 }]}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2b2b2b',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  title: {
    fontFamily: 'PixelFont',
    fontSize: 32,
    color: '#fff',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    width: '100%',
  },
  input: {
    flex: 1,
    fontFamily: 'PixelFont',
    fontSize: 18,
    color: '#fff',
    padding: 10,
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: '#444',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonText: {
    fontFamily: 'PixelFont',
    color: '#fff',
    fontSize: 18,
  },
  // Picker container styling so that it looks neat within the input row
  pickerContainer: {
    flex: 1,
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: '#444',
    marginRight: 10,
  },
  picker: {
    height: 50,
    color: '#fff',
  },
  // Habit item styling
  habitItem: {
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: '#333',
    padding: 10,
    marginVertical: 5,
    width: '100%',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitText: {
    fontFamily: 'PixelFont',
    fontSize: 20,
    color: '#fff',
  },
  categoryText: {
    fontFamily: 'PixelFont',
    fontSize: 16,
    color: '#ccc',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
    flexWrap: 'wrap',
  },
  habitButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 5,
    paddingHorizontal: 8,
    margin: 3,
    borderWidth: 1,
    borderColor: '#fff',
  },
  completedButton: {
    backgroundColor: '#4caf50',
  },
  buttonTextSmall: {
    fontFamily: 'PixelFont',
    fontSize: 14,
    color: '#fff',
  },
  streakRow: {
    alignItems: 'flex-end',
  },
  infoText: {
    fontFamily: 'PixelFont',
    fontSize: 16,
    color: '#ccc',
  },
  emptyText: {
    fontFamily: 'PixelFont',
    fontSize: 18,
    color: '#ccc',
    marginTop: 20,
  },
  // Filter buttons
  filterContainer: {
    marginBottom: 15,
    width: '100%',
  },
  filterButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 4,
  },
  activeFilterButton: {
    backgroundColor: '#4caf50',
  },
  filterButtonText: {
    fontFamily: 'PixelFont',
    fontSize: 16,
    color: '#fff',
  },
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 200,
    height: 200,
  },
  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#444',
    borderColor: '#fff',
    borderWidth: 2,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: 'PixelFont',
    fontSize: 24,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  modalButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  picker: {
    height: 50,
    color: '#fff', 
  },
  pickerItem: {
    fontFamily: 'PixelFont',
    fontSize: 18,
    color: '#fff',
  },
});
