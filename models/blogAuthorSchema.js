const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Message schema
// const messageSchema = new mongoose.Schema({
//   user: {
//     type: String,
//     required: false,
//   },
//   message: {
//     type: String,
//     required: false,
//   },
//   profile:{
//     type:String,
//     required:false
//   },
//   email: {
//     type: String,
//     required: true,
//   },
//   timestamp: {
//     type: Date,
//     default: Date.now,
//   },
// });

const messageSchema = new mongoose.Schema({
  authorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: false },
  user:      { type: String, required: false },
  message:   { type: String, required: false },
  profile:   { type: String, required: false },
  email:     { type: String, required: true  },
  timestamp: { type: Date,   default: Date.now },
});

const notificationSchema = new mongoose.Schema({
  postId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: false },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: false },
  discussionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', required: false },
  type:        { type: String, required: false },
  user:        { type: String, required: true  },
  message:     { type: String, required: true  },
  profile:     { type: String, required: false },
  url:         { type: String, required: true  },
  authorEmail: { type: String, required: true  },
  timestamp:   { type: Date,   default: Date.now },
});


const announcementSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    links: {
      type: [
        {
          title: { type: String, required: false }, // Title of the link
          url: { type: String, required: false },  // URL of the link
        },
      ],
      default: [],
      validate: {
        validator: function (v) {
          // Ensure all entries have unique URLs
          return Array.isArray(v) && new Set(v.map(link => link.url)).size === v.length;
        },
        message: "Links array must contain unique URLs",
      },
    },

    poster:{
      type:String,
      required:false
    },
    
   deliveredTo:{
    type: String,
     enum: ['all',"community",'coordinators'],
     default: 'all'
   }, 

    message: {
      type: String,
      required: true,
    },
    profile:{
      type:String,
      required:false
    },
    authorEmail: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
      image:{
      type:String,
      required:false
    },
  }
)

const postSchema = new mongoose.Schema({
  authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  title:       { type: String, required: true  },
  image:       { type: String, required: false },
  tenantId:    { type: String, required: true}, 
  links: {
    type: [{ title: { type: String, required: false }, url: { type: String, required: false } }],
    default: [],
    validate: {
      validator: (v) => Array.isArray(v) && new Set(v.map(l => l.url)).size === v.length,
      message: "Links array must contain unique URLs",
    },
  },
  documents: {
    type: [String], default: [], required: false,
    validate: {
      validator: (v) => Array.isArray(v) && new Set(v).size === v.length,
      message: "pdfs array must contain unique values",
    },
  },
  description: { type: String, required: true },
  category:    { type: String, required: true },
  views: {
    type: [String], default: [],
    validate: {
      validator: (v) => Array.isArray(v) && new Set(v).size === v.length,
      message: "Views array must contain unique values",
    },
  },
  likes: {
    type: [String], default: [],
    validate: {
      validator: (v) => Array.isArray(v) && new Set(v).size === v.length,
      message: "Views array must contain unique values",
    },
  },
  messages:  { type: [messageSchema], default: [] },
  
  timestamp: { type: Date, default: Date.now },
});

// ── Post indexes ──
postSchema.index({ authorId: 1 });
postSchema.index({ category: 1 });
postSchema.index({ authorId: 1, category: 1 });
postSchema.index({ timestamp: -1 });

const Post = mongoose.model('Post', postSchema);


// ─────────────────────────────────────────────────────────────
//  Author Schema  (normalized — posts stores ObjectId refs)
// ─────────────────────────────────────────────────────────────
const authorSchema = new mongoose.Schema({
  authorname: { type: String, required: true },
  bio: { type: String, required: false },
  role:       { type: String, enum: ['student', 'coordinator', 'admin', 'director'], default: 'student' },
  community:  { type: [String], default: [] },
  announcement: [announcementSchema],
  postBookmark: {
    type: [mongoose.Schema.Types.ObjectId], default: [],
    validate: {
      validator: (v) => Array.isArray(v) && new Set(v.map(id => id.toString())).size === v.length,
      message: "postBookmark must contain unique post IDs",
    },
  },
  password: { type: String, required: true },
  tenantId: { type: String, required: true },

  email: {
    type: String, required: true, unique: true,
    match: [emailRegex, 'Please provide a valid email address'],
  },
  profile:   { type: String,   required: false },
  followers: { type: [String], default: [] },
  following: { type: [String], default: [] },
  posts:     { type: [mongoose.Schema.Types.ObjectId], ref: 'Post', default: [] },
  notification: [notificationSchema],
  personalLinks: {
    type: [{ title: { type: String, required: false }, url: { type: String, required: false } }],
    default: [],
    validate: {
      validator: function (v) {
        const isUnique  = Array.isArray(v) && new Set(v.map(l => l.url)).size === v.length;
        const isMaxFive = v.length <= 5;
        return isUnique && isMaxFive;
      },
      message: props => {
        const urls = props.value.map(l => l.url);
        if (new Set(urls).size !== urls.length) return "Links array must contain unique URLs.";
        if (props.value.length > 5)             return "You can only add up to 5 links.";
        return "Invalid personal links.";
      },
    },
  },

  // achievements — embedded array, one entry per badge TYPE earned
  // badges: {
  //   type:    [badgeSchema],
  //   default: [],
  //   validate: {
  //     validator: (v) => {
  //       // each badgeId can only appear once — tiers tracked in history[]
  //       const ids = v.map(b => b.badgeId);
  //       return new Set(ids).size === ids.length;
  //     },
  //     message: "Duplicate badge type — use history[] for multiple tiers",
  //   },
  // },

  recentlyViewed: {
  posts: {
    type: [{
      authorEmail:{type: String, required: true},
      authorName:{type: String, required: true},
      postId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
      viewedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
  playlists: {
   
    type: [{
      authorEmail:{type: String},
      authorName:{type: String},
      playlistId: { type: mongoose.Schema.Types.ObjectId, ref: 'TutorPlayList', required: true },
      viewedAt:   { type: Date, default: Date.now },
    }],
    default: [],
  },
},

// so effectiveStreak() on the frontend computes correctly against IST midnight.
currentStreak:  { type: Number, default: 0 },
longestStreak:  { type: Number, default: 0 },
lastActiveDate: { type: String, default: null }, // "YYYY-MM-DD" IST
  
  otp:          { type: String },
  otpExpiresAt: { type: Date   },
});



// Password encryption before saving the author
authorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Skip if password is not modified

  try {
    const salt = await bcrypt.genSalt(10); // Generate salt with a factor of 10
    const hashPassword = await bcrypt.hash(this.password, salt); // Hash the password
    this.password = hashPassword; // Replace the plain password with the hashed one
    next();
  } catch (err) {
    next(new Error('Error hashing password: ' + err)); // Handle any errors during the hashing process
  }
});

// ── Author indexes ──
// authorSchema.index({ email: 1 });
authorSchema.index({ community: 1 });
authorSchema.index({ role: 1 });
authorSchema.index({ community: 1, role: 1 });

// Method to compare passwords during login
authorSchema.methods.comparePassword =  function (enteredPassword) {
  return  bcrypt.compare(enteredPassword, this.password); // Compare entered password with the hashed one
};


const Author = mongoose.model('Author', authorSchema);


module.exports = { Author, Post };


