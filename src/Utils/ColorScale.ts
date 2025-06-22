// src/utils/ColorScale.ts
import * as d3 from 'd3';

// Define the color scale to be used across the app
export const ColorScale = d3.scaleLinear<string>()
  .domain([-10, 0, 10]) // Input: Hostile -> Neutral -> Ally
  .range(['#e74c3c', '#f1c40f', '#2ecc71']) // Output: Red -> Yellow -> Green
  .clamp(true); // Ensures values outside the domain are clamped to the range