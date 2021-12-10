// Author: M.Witt, EAGLE M.Sc., Uni Würzburg

// Function for bitwise cloudmasking  
var cloudmask = function(image){
  
  // Define Bitvalues
  // For a combined Bitmask, you could use 40
  var cloudShadowBitmask = 8;
  var cloudsBitmask = 32;
  // var mask_both = 40;
  
  // Get qa band
  var qa_band = image.select('pixel_qa');
  // Combine clouds and cloudshadow into one
  // You can use either one
  // var combined_mask = qa_band.bitwiseAnd(mask_both).eq(0);
  var combined_mask = qa_band.bitwiseAnd(cloudShadowBitmask).eq(0)
                      .and(qa_band.bitwiseAnd(cloudsBitmask).eq(0));
  
  // Return the masked image
  return image.updateMask(combined_mask);
}

var geom = ee.Geometry.Polygon([[[7.8183696080846365, 50.72200898941881],
          [7.8183696080846365, 47.65001525671832],
          [14.893564920584636, 47.65001525671832],
          [14.893564920584636, 50.72200898941881]]]);

var plots = ee.FeatureCollection('users/wittmarius8/Points');
print(plots)

var L8_col = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
              .filterDate('2016-01-01', '2020-01-01')
              .filterBounds(geom);


var L8_col_masked = L8_col.map(cloudmask);
// print('Masked Image collection', L8_col_masked);

var test = L8_col_masked.first();
Map.addLayer(test,{bands: ['B4', 'B3', 'B2'], min:0, max:2000}, 'L8 RGB masked');
print(test)

// Create a NDVI / NDWI Image Collection
//var NDVI = L8_col_masked.map(function(image){
//  return image.select().addBands(image.normalizedDifference(['B5', 'B4']).rename('NDVI')).float();
//});

var NDWI = L8_col_masked.map(function(image){
  return image.select().addBands(image.normalizedDifference(['B5', 'B7']).rename('NDWI')).float();
});

// print('test', L8_col_masked_ndvi);
// Map.addLayer(L8_col_masked_ndvi.first(),{bands: ['NDVI'], min:0, max:1, palette: ['red', 'yellow', 'green']}, 'NDVI');



// Function to calculate min/max/mean at a customizable temporal interval.

var temporalCollection = function(collection, start, count, interval, units) {
  // Create a sequence of numbers, one for each time interval.
  var sequence = ee.List.sequence(0, ee.Number(count).subtract(1));
  
  var originalStartDate = ee.Date(start);
  
  return ee.ImageCollection(sequence.map(function(i) {
    
    // Get Star- and Enddate for current sequence step 
    var startDate = originalStartDate.advance(ee.Number(interval).multiply(i), units);
    var endDate = originalStartDate.advance(
      ee.Number(interval).multiply(ee.Number(i).add(1)), units);
    // Temporal aggregation of the ImageCollection
    return collection.filterDate(startDate, endDate)
        .reduce(ee.Reducer.mean().combine({
          reducer2: ee.Reducer.minMax(),
          sharedInputs: true
        })).set('system:time_start', startDate.millis());
  }));
};

// Set interval and number of bands to generate -- atm yearly mean/min/max for 2016
//var NDVI_temp_col = temporalCollection(NDVI, ee.Date('2016-01-01'), 36, 1, 'month');
//print('temporalCollection output', NDVI_temp_col)

var NDWI_temp_col = temporalCollection(NDWI, ee.Date('2016-01-01'), 36, 1, 'month');
print('temporalCollection output', NDWI_temp_col)


//var check = ee.Image(NDVI_temp_col.first());
//Map.addLayer(check, {bands: ['NDVI_mean'], min:0, max:1, palette: ["red", "yellow", "green"]}, 'check');

var graph = ui.Chart.image.seriesByRegion({
  imageCollection: NDWI_temp_col, 
  regions: plots, 
  band: 'NDWI_mean',
  reducer: ee.Reducer.mean(),
  scale: 30,
})

print(graph)