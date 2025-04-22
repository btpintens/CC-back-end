import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  brand: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  subCategory: {
    type: String,
    required: true,
  },
  color: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  image: {
    data: Buffer,
    contentType: String
  },
  weatherType: [{
    maxTemp: Number,
    minTemp: Number,
    maxHumidity: Number,
    minHumidity: Number,
    maxUvIndex: Number,
    minUvIndex: Number,
    maxWind: Number,
    precipType: String,
    precipIntensity: String,
  }],

  lastWorn: {
    type: Date,
  }
});

const outfitSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  topId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
  },
  bottomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
  },
  shoesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
  },
  accessoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
  },
  rating: {
    type: Number,
  }
});

export const Item = mongoose.model('Item', itemSchema);
export const Outfit = mongoose.model('Outfit', outfitSchema);