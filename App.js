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
  // Helper to generate time options (every 30 minutes)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const period = hour < 12 ? 'AM' : 'PM';
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        const minuteStr = minute === 0 ? '00' : minute;
        times.push(`${hour12}:${minuteStr} ${period}`);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Preset categories for the picker dropdown
  const presetCategories = [
    'General', 
    'Health', 
    'Work', 
    'Education', 
    'Finance', 
    'Fitness', 
    'Personal Growth', 
    'Relationships', 
    'Hobbies', 
    'Mental Well-being', 
    'Productivity'
  ];
  
  const [habits, setHabits] = useState([]);
  // State for adding a new habit (using a modal)
  const [input, setInput] = useState('');
  // Instead of a text input, we now use a picker:
  const [selectedTime, setSelectedTime] = useState('08:00 AM');
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
  const [habitInfoInput, setHabitInfoInput] = useState(''); // Additional info

  // Filter state: category string selected via buttons
  const [filterCategory, setFilterCategory] = useState('');

  // Sorting mode state: if true sort by streak, otherwise by creation date
  const [sortByStreak, setSortByStreak] = useState(false);

  // Refs for animations
  const lottieRef = useRef(null);
  const backgroundRef = useRef(null);

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

  // Add a new habit using the selected time from the picker
  const addHabit = () => {
    if (input.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const newHabit = {
        key: Date.now().toString(),
        title: input,
        category: selectedCategory || 'General',
        time: selectedTime,
        completedToday: false,
        streak: 0,
        history: [],
        info: '',
        createdAt: Date.now(),
      };
      setHabits([...habits, newHabit]);
      setInput('');
      setSelectedTime('12:00 AM'); // Reset to default
      setSelectedCategory('General');
      setAddHabitModalVisible(false);
    }
  };

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

  const openEditModal = (habit) => {
    setHabitToEdit(habit);
    setEditInput(habit.title);
    setEditCategory(habit.category || 'General');
    setEditModalVisible(true);
  };

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

  const openDetailsModal = (habit) => {
    setHabitForDetails(habit);
    setManualDateInput('');
    setHabitInfoInput(habit.info || '');
    setDetailsModalVisible(true);
  };

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

  const getUniqueCategories = () => {
    const categories = habits.map((h) => (h.category ? h.category : 'General'));
    return Array.from(new Set(categories));
  };

  // Updated renderHabit function with chain connectors.
  const renderHabit = ({ item, index }) => {
    // Since FlatList uses sortedHabits() as its data,
    // we can use that to determine the first and last items.
    const sortedData = sortedHabits();
    const isFirst = index === 0;
    const isLast = index === sortedData.length - 1;

    return (
      <View style={styles.chainContainer}>
        {/* Connector above if not the first item */}
        {!isFirst && <View style={styles.connectorTop} />}
        
        <View style={styles.habitItem}>
          <View style={styles.habitHeader}>
            <View>
              <Text style={styles.habitText}>{item.title}</Text>
              {item.time ? <Text style={styles.infoText}>Time: {item.time}</Text> : null}
            </View>
            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
          </View>
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
          <View style={styles.streakRow}>
            <Text style={styles.infoText}>Streak: {item.streak}</Text>
          </View>
        </View>
        {/* Connector below if not the last item */}
        {!isLast && <View style={styles.connectorBottom} />}
      </View>
    );
  };

  // Updated sortedHabits function
  const sortedHabits = () => {
    // Filter the habits first
    const filtered = habits.filter((habit) => {
      const habitCategory = (habit.category || 'General').toLowerCase();
      const activeFilter = filterCategory ? filterCategory.toLowerCase() : '';
      return activeFilter ? habitCategory === activeFilter : true;
    });
    // Clone the filtered array to avoid in-place mutation issues.
    const sortedList = [...filtered];
    if (sortByStreak) {
      // Sort so that habits with a higher streak come first
      sortedList.sort((a, b) => b.streak - a.streak);
    } else {
      // Sort so that the most recently created habits come first
      sortedList.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sortedList;
  };

  return (
    <ImageBackground
      source={require('./assets/background/bgg.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <LottieView
          ref={backgroundRef}
          source={require('./assets/animations/pixelart-background.json')}
          autoPlay
          loop
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <LottieView
              source={require('./assets/animations/small-title-animation.json')}
              autoPlay
              loop
              style={styles.titleAnimation}
            />
            <Text style={styles.titleText}>Pixie Habit Tracker</Text>
            <LottieView
              source={require('./assets/animations/small-title-animation.json')}
              autoPlay
              loop
              style={styles.titleAnimation}
            />
          </View>

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
                    filterCategory.toLowerCase() === cat.toLowerCase() &&
                      styles.activeFilterButton,
                  ]}
                  onPress={() => setFilterCategory(cat)}
                >
                  <Text style={styles.filterButtonText}>{cat}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: '#806050' }]}
                onPress={() => setSortByStreak(!sortByStreak)}
              >
                <Text style={styles.filterButtonText}>
                  {sortByStreak ? 'Sort by Date' : 'Sort by Streak'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <FlatList
            data={sortedHabits()}
            extraData={[habits, sortByStreak, filterCategory]} // force re-render on sort/filter change
            renderItem={renderHabit}
            keyExtractor={(item) => item.key}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No habits yet. Add one!</Text>
            }
          />

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
                  {/* Time Picker replaces the text input for time */}
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedTime}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                      onValueChange={(itemValue) => setSelectedTime(itemValue)}
                    >
                      {timeOptions.map((time) => (
                        <Picker.Item key={time} label={time} value={time} />
                      ))}
                    </Picker>
                  </View>
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
              <ScrollView
                  contentContainerStyle={styles.detailsScroll}
                  showsVerticalScrollIndicator={false}
                  overScrollMode="never"
                >       
                <Text style={styles.modalTitle}>Habit Details</Text>
                  <View style={styles.detailsSection}>
                    <Text style={styles.habitText}>{habitForDetails?.title}</Text>
                    <Text style={styles.infoText}>
                      Category: {habitForDetails?.category || 'General'}
                    </Text>
                    {habitForDetails?.time ? (
                      <Text style={styles.infoText}>Time: {habitForDetails?.time}</Text>
                    ) : null}
                    <Text style={styles.infoText}>
                      Current Streak: {habitForDetails?.streak}
                    </Text>
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

          {/* Floating Action Button */}
          <TouchableOpacity style={styles.fab} onPress={() => setAddHabitModalVisible(true)}>
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#F8BC68',
    borderStyle: 'solid',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    width: '90%',
  },
  titleAnimation: {
    width: 30,
    height: 30,
  },
  titleText: {
    fontFamily: 'PixelFont',
    fontSize: 32,
    color: '#E0A460',
    marginLeft: 10,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    fontFamily: 'PixelFont',
    fontSize: 18,
    color: '#F8BC68',
    padding: 10,
    borderColor: '#F8BC68',
    borderWidth: 2,
    backgroundColor: '#222',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8BC68',
    marginTop: 10,
  },
  buttonText: {
    fontFamily: 'PixelFont',
    color: '#F8BC68',
    fontSize: 18,
  },
  pickerContainer: {
    width: '100%',
    borderColor: '#F8BC68',
    borderWidth: 2,
    backgroundColor: '#222',
    marginBottom: 15,
  },
  picker: {
    height: 50,
    color: '#F8BC68',
  },
  pickerItem: {
    fontFamily: 'PixelFont',
    fontSize: 18,
    color: '#F8BC68',
  },
  habitItem: {
    borderColor: '#F8BC68',
    borderWidth: 2,
    backgroundColor: '#222',
    padding: 10,
    marginVertical: 5,
    width: '100%',
    borderRadius: 10,
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
    color: '#F8BC68',
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
    borderColor: '#F8BC68',
  },
  completedButton: {
    backgroundColor: '#4caf50',
  },
  buttonTextSmall: {
    fontFamily: 'PixelFont',
    fontSize: 14,
    color: '#F8BC68',
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
    backgroundColor: '#222',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#F8BC68',
  },
  filterButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F8BC68',
    borderRadius: 4,
  },
  activeFilterButton: {
    backgroundColor: '#4caf50',
  },
  filterButtonText: {
    fontFamily: 'PixelFont',
    fontSize: 16,
    color: '#F8BC68',
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
    backgroundColor: '#222',
    borderColor: '#F8BC68',
    borderWidth: 2,
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: 'PixelFont',
    fontSize: 24,
    color: '#F8BC68',
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
    borderColor: '#F8BC68',
  },
  detailsModalContent: {
    width: '90%',
    backgroundColor: '#555',
    borderColor: '#F8BC68',
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
    color: '#F8BC68',
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
    borderColor: '#F8BC68',
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
    borderColor: '#F8BC68',
  },
  removeButtonText: {
    fontFamily: 'PixelFont',
    fontSize: 12,
    color: '#F8BC68',
  },
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
    borderColor: '#F8BC68',
  },
  fabIcon: {
    fontFamily: 'PixelFont',
    fontSize: 36,
    color: '#F8BC68',
    lineHeight: 36,
  },
  // New styles for the chain connectors:
  chainContainer: {
    alignItems: 'center',
  },
  connectorTop: {
    width: 2,
    height: 15,
    borderLeftWidth: 2,
    borderColor: '#222',
    borderStyle: 'dotted',
    marginBottom: -2,
  },
  connectorBottom: {
    width: 2,
    height: 15,
    borderLeftWidth: 2,
    borderColor: '#222',
    borderStyle: 'dotted',
    marginTop: -2,
  },
});

