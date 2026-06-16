const User = require('../models/User');

// @desc    Get Authenticated User Profile
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-refreshToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(`Get profile error: ${error.message}`);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
};

// @desc    Update Authenticated User Profile
// @route   PUT /api/profile
// @access  Private
const updateProfile = async (req, res) => {
  const {
    name,
    username,
    profilePicture,
    bio,
    age,
    gender,
    city,
    state,
    preferredPosition,
    skillLevel,
    battingStyle,
    bowlingStyle
  } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check username uniqueness if changing
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username: username.toLowerCase().trim() });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username.toLowerCase().trim();
    }

    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;
    if (bio !== undefined) user.bio = bio;
    if (age !== undefined) user.age = age;
    if (gender) user.gender = gender;
    if (city) user.city = city;
    if (state) user.state = state;
    if (preferredPosition) user.preferredPosition = preferredPosition;
    if (skillLevel) user.skillLevel = skillLevel;
    if (battingStyle) user.battingStyle = battingStyle;
    if (bowlingStyle) user.bowlingStyle = bowlingStyle;

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Update profile error: ${error.message}`);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
};

// @desc    Get User Profile by ID (Public)
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-refreshToken -email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(`Get user by id error: ${error.message}`);
    res.status(500).json({ message: 'Server error fetching user.' });
  }
};

// @desc    Toggle "Looking for Match" Mode
// @route   PUT /api/profile/looking-for-match
// @access  Private
const toggleLookingForMatch = async (req, res) => {
  const { isLookingForMatch, longitude, latitude, preferredRadius, availability } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isLookingForMatch = isLookingForMatch !== undefined ? isLookingForMatch : !user.isLookingForMatch;

    if (user.isLookingForMatch) {
      // Ensure coordinates are set properly
      const lng = parseFloat(longitude);
      const lat = parseFloat(latitude);

      if (isNaN(lng) || isNaN(lat)) {
        return res.status(400).json({ message: 'Coordinates are required when looking for a match.' });
      }

      user.lookingForMatchConfig = {
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        preferredRadius: parseFloat(preferredRadius) || 10,
        availability: availability || []
      };
    }

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Toggle looking for match error: ${error.message}`);
    res.status(500).json({ message: 'Server error toggling match finder mode.' });
  }
};

// @desc    Upload User Avatar Image
// @route   POST /api/profile/upload-avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    let relativePath = req.file.path.replace(/\\/g, '/');
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }

    res.status(200).json({
      message: 'Avatar uploaded successfully',
      profilePicture: relativePath
    });
  } catch (error) {
    console.error(`Upload avatar error: ${error.message}`);
    res.status(500).json({ message: 'Server error uploading avatar.' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserById,
  toggleLookingForMatch,
  uploadAvatar
};
