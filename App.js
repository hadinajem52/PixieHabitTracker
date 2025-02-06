import React, { useState, useRef, useEffect } from 'react';
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
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFonts } from 'expo-font';
import AppLoading from 'expo-app-loading';
import LottieView from 'lottie-react-native';

export default function App() {
  // Preset categories for the picker dropdown
  const presetCategories = ['General', 'Health', 'Work', 'Education', 'Finance'];

  const [habits, setHabits] = useState([]);
  // States for adding a new habit (now used in a modal)
  const [input, setInput] = useState('');
  const [timeInput, setTimeInput] = useState(''); // State for the habit time
  const [selectedCategory, setSelectedCategory] = useState('General');

  const [showAnimation, setShowAnimation] = useState(false);

  // State for the Add Habit modal visibility
  const [addHabitModalVisible, setAddHabitModalVisible] = useState(false);

  // States for editing a habit
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState(null);
  const [editInput, setEditInput] = useState('');
  const [editCategory, setEditCategory] = useState('General');

  // States for habit details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [habitForDetails, setHabitForDetails] = useState(null);
  const [manualDateInput, setManualDateInput] = useState('');
  const [habitInfoInput, setHabitInfoInput] = useState(''); // State for additional info

  // Filter state: category string selected via buttons
  const [filterCategory, setFilterCategory] = useState('');

  // Sorting mode state: if true sort by streak, otherwise by creation date
  const [sortByStreak, setSortByStreak] = useState(false);

  const backgroundImage = require('./assets/background.jpg'); // Add your image file


  const lottieRef = useRef(null);

  let [fontsLoaded] = useFonts({
    PixelFont: require('./assets/fonts/PixelFont.ttf'),
  });

  // Load saved habits from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedHabits = await AsyncStorage.getItem('habits');
        if (storedHabits !== null) {
          setHabits(JSON.parse(storedHabits));
        }
      } catch (error) {
        console.error('Error loading habits', error);
      }
    })();
  }, []);

  // Save habits to AsyncStorage whenever they change
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('habits', JSON.stringify(habits));
      } catch (error) {
        console.error('Error saving habits', error);
      }
    })();
  }, [habits]);

  if (!fontsLoaded) {
    return <AppLoading />;
  }

  // Add a new habit (including time) and then close the modal
  const addHabit = () => {
    if (input.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const newHabit = {
        key: Date.now().toString(),
        title: input,
        category: selectedCategory || 'General',
        time: timeInput, // Save the entered time
        completedToday: false,
        streak: 0,
        history: [],
        info: '', // Additional info (initially empty)
        createdAt: Date.now(),
      };
      setHabits([...habits, newHabit]);
      setInput('');
      setTimeInput('');
      setSelectedCategory('General');
      setAddHabitModalVisible(false);
    }
  };

  // Toggle completion status for today
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
    setEditCategory(habit.category || 'General');
    setEditModalVisible(true);
  };

  // Save the edited habit info
  const saveEdit = () => {
    if (editInput.trim()) {
      setHabits((prevHabits) =>
        prevHabits.map((habit) =>
          habit.key === habitToEdit.key
            ? { ...habit, title: editInput, category: editCategory || 'General' }
            : habit
        )
      );
      setEditModalVisible(false);
      setHabitToEdit(null);
      setEditInput('');
      setEditCategory('General');
    }
  };

  // Open details modal and initialize the additional info state
  const openDetailsModal = (habit) => {
    setHabitForDetails(habit);
    setManualDateInput('');
    setHabitInfoInput(habit.info || '');
    setDetailsModalVisible(true);
  };

  // Mark a manual completion for a specified date and update the modal info
  const markManualCompletion = () => {
    if (!manualDateInput.trim()) return;
    let updatedHabit = null;
    setHabits((prevHabits) => {
      const updated = prevHabits.map((habit) => {
        if (habit.key === habitForDetails.key) {
          if (!habit.history.includes(manualDateInput)) {
            updatedHabit = {
              ...habit,
              history: [manualDateInput, ...habit.history],
            };
            return updatedHabit;
          }
        }
        return habit;
      });
      return updated;
    });
    if (updatedHabit) {
      setHabitForDetails(updatedHabit);
      Alert.alert('Success', 'Manual completion added!');
    }
    setManualDateInput('');
  };

  // Remove a specific completion date from the habit history
  const removeCompletion = (habitKey, date) => {
    let updatedHabit = null;
    setHabits((prevHabits) => {
      const updated = prevHabits.map((habit) => {
        if (habit.key === habitKey) {
          updatedHabit = {
            ...habit,
            history: habit.history.filter((d) => d !== date),
          };
          return updatedHabit;
        }
        return habit;
      });
      return updated;
    });
    if (updatedHabit) {
      setHabitForDetails(updatedHabit);
    }
  };

  // Reset the streak of a habit and update the modal info
  const resetStreak = (habit) => {
    Alert.alert('Reset Streak', 'Are you sure you want to reset the streak?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          let updatedHabit = null;
          setHabits((prevHabits) => {
            const updated = prevHabits.map((h) => {
              if (h.key === habit.key) {
                updatedHabit = { ...h, streak: 0 };
                return updatedHabit;
              }
              return h;
            });
            return updated;
          });
          if (updatedHabit) {
            setHabitForDetails(updatedHabit);
          }
        },
      },
    ]);
  };

  // Update (or add) additional info for the habit from the details modal
  const updateHabitInfo = () => {
    let updatedHabit = null;
    setHabits((prevHabits) => {
      const updated = prevHabits.map((habit) => {
        if (habit.key === habitForDetails.key) {
          updatedHabit = { ...habit, info: habitInfoInput };
          return updatedHabit;
        }
        return habit;
      });
      return updated;
    });
    if (updatedHabit) {
      setHabitForDetails(updatedHabit);
      Alert.alert('Success', 'Habit info updated!');
    }
  };

  // Get a list of unique categories from the habits
  const getUniqueCategories = () => {
    const categories = habits.map((h) => (h.category ? h.category : 'General'));
    return Array.from(new Set(categories));
  };

  // Render a habit item with organized layout
  const renderHabit = ({ item }) => {
    const habitCategory = (item.category || 'General').toLowerCase();
    const activeFilter = filterCategory ? filterCategory.toLowerCase() : '';

    if (activeFilter && habitCategory !== activeFilter) {
      return null;
    }

    return (

      <View style={styles.habitItem}>
        {/* Header row: Habit title and category */}
        <View style={styles.habitHeader}>
          <View>
            <Text style={styles.habitText}>{item.title}</Text>
            {item.time ? <Text style={styles.infoText}>Time: {item.time}</Text> : null}
          </View>
          <Text style={styles.categoryText}>{item.category || 'General'}</Text>
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

  // Apply sorting to the filtered habits list
  const sortedHabits = () => {
    let list = habits.filter((habit) => {
      const habitCategory = (habit.category || 'General').toLowerCase();
      const activeFilter = filterCategory ? filterCategory.toLowerCase() : '';
      return activeFilter ? habitCategory === activeFilter : true;
    });

    if (sortByStreak) {
      list = list.sort((a, b) => b.streak - a.streak);
    } else {
      list = list.sort((a, b) => a.createdAt - b.createdAt);
    }
    return list;
  };

  return (
     <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.overlay}> 
      <Text style={styles.title}>Habit Tracker</Text>

      {/* Filter and Sorting Buttons */}
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
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: '#9c27b0' }]}
            onPress={() => setSortByStreak(!sortByStreak)}
          >
            <Text style={styles.filterButtonText}>
              {sortByStreak ? 'Sort by Date' : 'Sort by Streak'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Habits List */}
      <FlatList
        data={sortedHabits()}
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

      {/* Add New Habit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addHabitModalVisible}
        onRequestClose={() => setAddHabitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Habit</Text>
            <View style={styles.modalInputGroup}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Habit Title"
                placeholderTextColor="#ccc"
              />
              <TextInput
                style={styles.input}
                value={timeInput}
                placeholder="Habit Time (e.g. 08:00 AM)"
                placeholderTextColor="#ccc"
                onChangeText={setTimeInput}
              />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCategory}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                >
                  {presetCategories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={addHabit}>
                <Text style={styles.buttonText}>Add Habit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#d32f2f' }]}
                onPress={() => setAddHabitModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
          <View style={styles.detailsModalContent}>
            <ScrollView contentContainerStyle={styles.detailsScroll}>
              <Text style={styles.modalTitle}>Habit Details</Text>
              <View style={styles.detailsSection}>
                <Text style={styles.habitText}>{habitForDetails?.title}</Text>
                <Text style={styles.infoText}>Category: {habitForDetails?.category || 'General'}</Text>
                {habitForDetails?.time ? (
                  <Text style={styles.infoText}>Time: {habitForDetails?.time}</Text>
                ) : null}
                <Text style={styles.infoText}>Current Streak: {habitForDetails?.streak}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Completion History</Text>
                {habitForDetails?.history.length > 0 ? (
                  habitForDetails.history.map((date, index) => (
                    <View key={index} style={styles.historyItem}>
                      <Text style={styles.infoText}>• {date}</Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeCompletion(habitForDetails.key, date)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.infoText}>No completions yet.</Text>
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Add Manual Completion</Text>
                <TextInput
                  style={styles.manualInput}
                  value={manualDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  onChangeText={setManualDateInput}
                />
                <TouchableOpacity style={styles.addButton} onPress={markManualCompletion}>
                  <Text style={styles.buttonText}>Mark Completion</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: '#ff5722', marginTop: 10 }]}
                  onPress={() => resetStreak(habitForDetails)}
                >
                  <Text style={styles.buttonText}>Reset Streak</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Additional Info</Text>
                <TextInput
                  style={styles.manualInput}
                  value={habitInfoInput}
                  placeholder="Enter additional info..."
                  placeholderTextColor="#666"
                  onChangeText={setHabitInfoInput}
                />
                <TouchableOpacity style={styles.addButton} onPress={updateHabitInfo}>
                  <Text style={styles.buttonText}>Update Info</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.modalButton, { marginTop: 15 }]}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button (FAB) to open the Add Habit modal */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddHabitModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
    </ImageBackground>

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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 50,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent overlay for readability
    padding: 20,
  },
  input: {
    width: '100%',
    fontFamily: 'PixelFont',
    fontSize: 18,
    color: '#fff',
    padding: 10,
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: '#444',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    marginTop: 10,
  },
  buttonText: {
    fontFamily: 'PixelFont',
    color: '#fff',
    fontSize: 18,
  },
  pickerContainer: {
    width: '100%',
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: '#444',
    marginBottom: 15,
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
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: 'PixelFont',
    fontSize: 24,
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  detailsModalContent: {
    width: '90%',
    backgroundColor: '#555',
    borderColor: '#fff',
    borderWidth: 2,
    padding: 20,
    maxHeight: '80%',
  },
  detailsScroll: {
    paddingBottom: 20,
  },
  detailsSection: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontFamily: 'PixelFont',
    fontSize: 20,
    color: '#fff',
    marginBottom: 5,
    textDecorationLine: 'underline',
  },
  divider: {
    borderBottomColor: '#888',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  manualInput: {
    fontFamily: 'PixelFont',
    fontSize: 18,
    color: '#000',
    padding: 10,
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: '#ddd',
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  removeButton: {
    backgroundColor: '#d32f2f',
    padding: 5,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  removeButtonText: {
    fontFamily: 'PixelFont',
    fontSize: 12,
    color: '#fff',
  },
  // Floating Action Button (FAB)
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4caf50',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fabIcon: {
    fontFamily: 'PixelFont',
    fontSize: 36,
    color: '#fff',
    lineHeight: 36,
  },
});
