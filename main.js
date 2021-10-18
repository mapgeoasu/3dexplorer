// JS for the map
require(["esri/Map", "esri/views/SceneView", "esri/WebScene", "esri/layers/SceneLayer", "esri/tasks/support/Query",
  "esri/widgets/Home", "esri/geometry/Extent"], function(
  Map,
  SceneView,
  WebScene,
  SceneLayer,
  Query,
  Home,
  Extent      
) { 
  // Important variables for connecting the sceneview to the AGOL API  
  // Service URL for the maps_master table on AGOL    
  var tableURL = "https://services3.arcgis.com/0OPQIK59PJJqLK0A/ArcGIS/rest/services/maps_master/FeatureServer/0/";
  // Title for the Cabinets Layer
  var cabTitle = "Cabinets_Shelves";        
 
  // setup the variable for highlight with no value  
  var highlight = null;  

  // Load webscene from portal item
  var webscene = new WebScene({
    portalItem: {
      // autocasts as new PortalItem()
      id: "78d7af4d3b524ddda205fe1c542c52ac" // this is the id of the sceneview the app is connected to
    }
  });   

  var view = new SceneView({
    container: "viewDiv",
    qualityProfile: "high",
    highlightOptions: {
      color: [210, 49, 83] // color of the highlight when a feature is selected
    }, 
    map: webscene,          
    //zoom: 21,
    /*camera: {
      position: {
        latitude: 33.41905660,
        longitude: -111.93427050,
        z: 26.78385
      },
      tilt: 67.13,
      heading: 338.63
    }*/
  });    

 /* view.constraints = {
    geometry: {            // Constrain lateral movement to Lower Manhattan
      type: "extent",
      xmin: -111.9345778519999,
      ymin:  33.41921250900003,
      xmax: -111.93427068599996,
      ymax:  33.419464501000036,
      zmin: 8.055864,
      zmax: 10.646664
    },
    minScale: 500000,      // User cannot zoom out beyond a scale of 1:500,000
    maxScale: 0,           // User can overzoom tiles
    rotationEnabled: true // Disables map rotation
  };    */
  
  // Dock the popup to a fixed position
  view.popup.dockOptions = {
    // Disable the dock button so users cannot undock the popup
    buttonEnabled: false,
    // Dock the popup when the size of the view is less than or equal to 600x1000 pixels
    breakpoint: {
      width: 10000,
      height: 10000
    }
  };

  // Show modal on page load
  // Use cookies so it doesn't show up every time 
  $(document).ready(function() {
    if ($.cookie('pop') == null) {
        $('#infoModal').modal('show');
        $.cookie('pop', '7');
    }
   }); 

  // SQL Option is hidden by 
  $('.hide').hide();

  // key code for the SQL Search option
  document.onkeyup=function(e){
  var e = e || window.event; // for IE to cover IEs window event-object
  if(e.altKey && e.which == 65) {
    $('.hide').show();
    return false;
  }
}

  // setup a new viewer to display the map scans
  var viewer = new Viewer(document.getElementById('image'), {
    navbar: false,
    inline: false,
    toolbar: {
      zoomIn: 1,
      zoomOut: 1,
      oneToOne: 1,
      reset: 1,
      prev: 0,
      play: {
        show: 1,
        size: 'large',
      },
      next: 0,
      rotateLeft: 1,
      rotateRight: 1,
      flipHorizontal: 1,
      flipVertical: 1,
    },
    viewed() {
      viewer.zoomTo(1);
    },
  });  

  /* Set the width of the sidebar to 250px and the left margin of the page content to 250px */
function openNav() {
  table.redraw(true);
  document.getElementById("mySidebar").style.width = "25%";
  document.getElementById("viewDiv").style.marginLeft = "25%";
  document.getElementById("viewDiv").style.width = "75%";
  document.getElementsByClassName("container")[0].style.width = "80%";
  //document.getElementsByClassName("container")[0].style.left = "28%";
}

/* Set the width of the sidebar to 0 and the left margin of the page content to 0 */
function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("viewDiv").style.marginLeft = "0";
  document.getElementById("viewDiv").style.width = "100%";
  document.getElementsByClassName("container")[0].style.width = "60%";
  //document.getElementsByClassName("container")[0].style.left = "3%";
}

// when a row in the table is seleted or queried, get its attributes.
// populate a new popup with this information 
function getRowData(row) {                       
  //view.popup.close();
  var drawerId = row._row.data.attributes.LOC_ID;  
  var itemTitle = row._row.data.attributes.TITLE;
  var itemDate = row._row.data.attributes.DATE;
  var itemAuthor = row._row.data.attributes.AUTHOR;
  var itemLink = row._row.data.attributes.CATALOG_LINK;
  var itemPub =  row._row.data.attributes.PUBLISHER;
  var itemScale =  row._row.data.attributes.SCALE;
  var itemNum =  row._row.data.attributes.CALL_NUM;
  var thumbUrl = row._row.data.attributes.THUMB_URL;
  var indexUrl = row._row.data.attributes.INDEX_URL;
  var supUrl = row._row.data.attributes.SUP_URL;
  var locName = "Drawer ";

  if (drawerId >= 241 && drawerId < 253) {
    locName = "Shelf ";
  } else if (drawerId >= 253 && drawerId < 261) {
    locName = "Cabinet Drawer ";
  } else if (drawerId >= 261) {
    locName = "Stack Top ";
  }

  // Truncate the popup title
  if (itemTitle.length > 40) {
    var truncTitle = (itemTitle.substring(0, 40) + "...");
  } else {
    var truncTitle = itemTitle;
  }

  // Add popup items to an array
  var items = [itemScale, itemAuthor, itemDate, itemLink, itemPub, itemNum];

  // if the item have no value leave them blank
  for (var i = 0; i < items.length; i++) {
    if (items[i] == '' || items[i] == null) {
      items[i] = " ";   
    }
  }

  // Get the cabinets layer from webScene
  var cabLayer = webscene.allLayers.filter(function(elem) {
    return elem.title === cabTitle;
  }).items[0];        
  var query = cabLayer.createQuery();
  // Query the cabinets layer for the LOC_ID
  query.where = "LOC_ID =" + "'" + drawerId + "'";
  query.returnGeometry = true;               
  query.returnZ = true;
  query.outFields = ["OBJECTID", "Shelf_ID", "FC_DRAWER_ID", "LOC_ID", "Z_Min", "Z_Max"];
  cabLayer.queryFeatures(query)
    .then(function(response){
       // returns a feature set with features containing an OBJECTID
       var objectID = response.features[0].attributes.OBJECTID;
       var shelfId = response.features[0].attributes.Shelf_ID;
       var fileCabId = response.features[0].attributes.FC_DRAWER_ID;
       var locId = response.features[0].attributes.LOC_ID;
       var zmin = (response.features[0].attributes.Z_Min / 3.28);
       var zmax = (response.features[0].attributes.Z_Max / 3.28);       
      
       view.whenLayerView(cabLayer).then(function(layerView) {
          var queryExtent = new Query({
            objectIds: [objectID]
          });
          // zoom to the extent of drawer that is clicked on the table  
          var new_ext = new Extent({
            xmin: response.features[0].geometry.extent.xmin, 
            ymin: response.features[0].geometry.extent.ymin, 
            zmin: zmin,
            xmax: response.features[0].geometry.extent.xmax, 
            ymax: response.features[0].geometry.extent.ymax,
            zmax: zmax,                        
            spatialReference: { wkid: 4326 }
          });

          cabLayer.queryExtent(queryExtent).then(function(result) {  
            // change the camera position to correspond to the matching cabinet of the record            
            if (drawerId >= 1 && drawerId <= 30 ) {              
             view.goTo({
              center: new_ext.expand(4),
             // zoom: 13,
              //tilt: 75,
              heading: 358.54
              }, {speedFactor: 0.5 });   
            } else if (drawerId >= 31 && drawerId <= 60 ) {
              view.goTo({
                center: new_ext.expand(4),
               // zoom: 13,
                //tilt: 75,
                heading: 170.25
              }, {speedFactor: 0.5 });             
            } else if (drawerId >= 61 && drawerId <= 120 ) {
              view.goTo({
                center: new_ext.expand(4),
               // zoom: 13,
                //tilt: 75,
                heading: 94.93
              }, {speedFactor: 0.5 });             
            } else if (drawerId >= 121 && drawerId <= 180 ) {
              view.goTo({
                center: new_ext.expand(4),
               // zoom: 13,
                //tilt: 75,
                heading: 92.12
              }, {speedFactor: 0.5});             
            } else if (drawerId >= 181 && drawerId <= 240 ) {
              view.goTo({
                center: new_ext.expand(4),
               // zoom: 13,
                tilt: 41.64,
                heading: 5.61
                }, {speedFactor: 0.5 });             
            } else if (drawerId >= 241 && drawerId <= 252 ) {
              view.goTo({
                center: new_ext.expand(6),
               // zoom: 13,
                tilt: 38.31,
                heading: 183.82
                }, {speedFactor: 0.5 }); 
            } else if (drawerId >= 253) {
              view.goTo({
                center: new_ext.expand(6),
               // zoom: 13,
                tilt: 62.73,
                heading: 0.50
                }, {speedFactor: 0.5 }); 
            }
          });          

          // reduce popup size
          $(function() {            
              $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');                
          });
          
          // if any, remove the previous highlights
          if (highlight) {
            highlight.remove();
          }
          // highlight the feature with the returned objectId
          highlight = layerView.highlight([objectID]);
          })    

          // If the record is located in a bookshelf, use the shelf #
          if (locId >= 241 && locId < 253) {
            locId = shelfId;
          } else if (locId >= 253 && locId <= 260) {
            locId = fileCabId;
          }
          console.log(locName);      
          if (locName == "Stack Top ") {
            console.log("stack top");
            locId = "";
          }
          // check if the clicked record has an existing image
          if (thumbUrl !== '' && thumbUrl !== null) {
            // change the image URL and title to display in the viewer
            document.getElementById('image').src=thumbUrl;
            document.getElementById('image').alt=itemTitle;
            viewer.update();                
            
            // open a popup at the drawer location of the selected map
            view.popup.open({                  
              // Set the popup's title to the coordinates of the clicked location
              title: "<h6><b>" + truncTitle,  
              content: "<img src='" + thumbUrl + "' class='thumbdisplay'/><br><br><b>Title: </b>" + itemTitle +
              "<br><br><b>Date: </b>" + items[2] + "<br><br><b>Author: </b>" + items[1] + "<br><br><b>Publisher: </b>" + 
              items[4] + "<br><br><b>Scale: </b>" + items[0] + "<br><br><b>Call Number: </b>" + items[5] +
              "<br><br><b>Location: </b>" + locName + locId + "<br><a href=" + "'" + itemLink + 
              "' target='_blank' rel='noopener noreferrer' class='catlink'>View item in ASU Library catalog</a>" +              
              "<a href=" + "'" + indexUrl + "' target='_blank' rel='noopener noreferrer' class='indexlink'>View item in spatial index</a>" +
              "<a href=" + "'" + supUrl + "' target='_blank' rel='noopener noreferrer' class='suplink'>Learn more about this item</a>" +
              "<a href='https://lib.asu.edu/geo/services' target='_blank' rel='noopener noreferrer' class='maroon'>Request access</a>",
              // "<br><br><h6></b><a href='#' id='prev' class='previous round'>&#8249; Previous</a><a href='#' id='next' class='next round'>Next &#8250;</a>",
              location: response.features[0].geometry.centroid, // Set the location of the popup to the clicked location 
              actions: []      
            });                   
          } else {
            view.popup.open({
              // Set the popup's title to the coordinates of the clicked location
              title: "<h6><b>" + truncTitle,   
              content: "<b>Title: </b>" + itemTitle +
              "<br><br><b>Date: </b>" + items[2] + "<br><br><b>Author: </b>" + items[1] + "<br><br><b>Publisher: </b>" + 
              items[4] + "<br><br><b>Scale: </b>" + items[0] + "<br><br><b>Call Number: </b>" + items[5] +
              "<br><br><b>Location: </b>" + locName + locId + "<br><a href=" + "'" + itemLink + 
              "' target='_blank' rel='noopener noreferrer' class='catlink'>View item in ASU Library catalog</a>" +              
              "<a href=" + "'" + indexUrl + "' target='_blank' rel='noopener noreferrer' class='indexlink'>View item in spatial index</a>" +
              "<a href=" + "'" + supUrl + "' target='_blank' rel='noopener noreferrer' class='suplink'>Learn more about this item</a>" +
              "<a href='https://lib.asu.edu/geo/services' target='_blank' rel='noopener noreferrer' class='maroon'>Request access</a>",
              //"<br><br><h6></b><a href='#' id='prev' class='previous round'>&#8249; Previous</a><a href='#' id='next' class='next round'>Next &#8250;</a>",
              location: response.features[0].geometry.centroid, // Set the location of the popup to the clicked location 
              actions: []      
            });                 
          }
          // if any popup links don't have valid URL values, remove them  
          if (itemLink == "NOT FOUND") {
            $(function() {             
              $('.catlink').css({"display":"none"});
            });
          } else {
              $('.catlink').css({"display":"block"});
          }

          if (indexUrl == null) {
            $(function() {             
              $('.indexlink').css({"display":"none"});
            });
          } else {
              $('.indexlink').css({"display":"block"});
          }

          if (supUrl == null) {
            $(function() {             
              $('.suplink').css({"display":"none"});
            });
          } else {
              $('.suplink').css({"display":"block"});
          }
     });    
}

  // when the user clicks the thumbnail, open the viewer
  $(document).on('click','.thumbdisplay', function(){    
    viewer.show();
  });

  // listen for changes to the sidebar element
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutationRecord) {
      // if the sidebar opens, hide the view item list button      
      if (mutationRecord.target.style.width == "25%") {
        view.popup.viewModel.allActions.getItemAt(0).visible = false;
        $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');        
      } else {
        view.popup.viewModel.allActions.getItemAt(0).visible = true; 
        $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '55px');        
      }       
    });    
  });

  var target = document.getElementById('mySidebar');
  observer.observe(target, { attributes : true, attributeFilter : ['style'] });  
  
  // Creates a new table to hold our map attributes  
  var table = new Tabulator("#drawers-table", {             
      //height: "88%", 
      virtualDomBuffer: 1600,
      responsiveLayout:"collapse",   
      layout:"fitDataFill",         
      selectable: 1,
      clipboard:true, //enable clipboard functionality                        
      columns:[
          {title:"Title", field:"attributes.TITLE", width: 500},
          {title:"Author", field:"attributes.AUTHOR", width: 300, visible:false},
          {title:"Publisher", field:"attributes.PUBLISHER", width: 300, visible: false},
          {title:"Date", field:"attributes.DATE", width: 150},
          {title:"Scale", field:"attributes.SCALE", width: 120, visible:false},
          {title:"Catalog Item", field:"attributes.CATALOG_LINK", width: 400, formatter:"link", visible: false,
          formatterParams:{ target:"_blank"}},
          {title:"Call Number", field:"attributes.CALL_NUM", width: 250, visible:false},                                
          {title:"Language", field:"attributes.LANG", width: 150, visible:false},
          {title:"Theme", field:"attributes.THEME", width: 150, visible:false},
          {title:"Region / Geography", field:"attributes.GEO", width: 200, visible:false},                
          {title:"Drawer ID", field:"attributes.LOC_ID", width: 120, visible:false},   
          {title:"Location", field:"attributes.LOC_TYPE", width: 120, visible:false},  
          {title:"Order", field:"attributes.MAP_ORDER", width: 120, visible:false},                    
      ],    
      initialSort:[
        //{column:"attributes.MAP_ORDER", dir:"asc"}, //sort by this first        
      ],        
      // Detect when someone clicks on a row in the table
      rowClick:function(e, row){ 
        view.popup.close();   
        // When the table row is clicked hide the table 
        $('#drawerModal').modal('hide');        
        // when a row in the table is clicked call the getRowData function
        getRowData(row);   
      },
      groupHeader:function(value, count, data, group){        
        if (value < 241) {
          return "Drawer: " + value + "<span style='color:#8c1d40; margin-left:10px;'>(" + count + " items)</span>"; 
        } else if (value >= 241 && value < 253) {   
          if (value == 241) {
            value = 1;
          } else if (value == 242) {
            value = 2;
          } else if (value == 243) {
            value = 3;
          } else if (value == 244) {
            value = 4;
          } else if (value == 245) {
            value = 5;
          } else if (value == 246) {
            value = 6;
          } else if (value == 247) {
            value = 7;
          } else if (value == 248) {
            value = 8;
          } else if (value == 249) {
            value = 9;
          } else if (value == 250) {
            value = 10;
          } else if (value == 251) {
            value = 11;
          } else if (value == 252) {
            value = 12;
          }     
          return "Shelf: " + value + "<span style='color:#8c1d40; margin-left:10px;'>(" + count + " items)</span>";
        } else if (value >= 253 && value < 261 ) {
          if (value == 253) {
            value = 1;
          } else if (value == 254) {
            value = 2;
          } else if (value == 255) {
            value = 3;
          } else if (value == 256) {
            value = 4;
          } else if (value == 257) {
            value = 5;
          } else if (value == 258) {
            value = 6;
          } else if (value == 259) {
            value = 7;
          } else if (value == 260) {
            value = 8;
          }
          return "Cabinet Drawer: " + value + "<span style='color:#8c1d40; margin-left:10px;'>(" + count + " items)</span>";
        } else if (value >= 261) {
          return "Stack Top" + "<span style='color:#8c1d40; margin-left:10px;'>(" + count + " items)</span>";
        }
      },    
  });        
  
  //trigger download of mapdata.csv file
  $("#download").click(function(){
      table.download("csv", "mapdata.csv", {sheetName:"Map Data"});
  });

  // declare features as global variable so it can retreive results in the table        
  var features;

  view.when(function() {
    // Get the cabinets layer from webScene
    var cabLayer = webscene.allLayers.filter(function(elem) {
      return elem.title === cabTitle;
    }).items[0];
    // get the LOC_ID and DRAWER_TITLE  
    cabLayer.outFields = ['LOC_ID', 'LOC_TITLE', 'Shelf_ID', 'FC_DRAWER_ID'];   

    // retrieve the layer view of the scene layer
    view.whenLayerView(cabLayer)
      .then(function(cabLayerView) {
        view.on("click", function(event) { 
          // if any, remove the previous popup actions
          view.popup.actions = [];
          // if any, remove the previous highlights
          if (highlight) {
            highlight.remove();
          }

          view.hitTest(event, { include: cabLayer }).then(function(response) {                       
            // check if a feature is returned from the cabLayer
            if (response.results.length) {                          
              $(".esri-icon-table").hide();
              $("#drawerTitle").hide();
              const graphic = response.results[0].graphic;
              console.log(graphic);
              // Get the LOC_ID of the clicked drawer
              var drawerId = graphic.attributes.LOC_ID;
              var drawerTitle = graphic.attributes.LOC_TITLE;  
              var shelfId = graphic.attributes.Shelf_ID;  
              var fileCabId = graphic.attributes.FC_DRAWER_ID;           

              console.log(drawerId);
              // Call to the ArcGIS REST API to retreive the maps in each drawer
              $.ajax({
                      dataType: 'json',
                      url: tableURL + 'query?where=LOC_ID+%3D+' + drawerId + '&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
                      type: "GET",    
                      success: function(data) {
                       if (data.features.length <= 0) {
                        if (drawerId < 241) {
                          cabLayer.popupTemplate = {
                              title: "<h6>Drawer " + drawerId,
                              content: "Description: " + drawerTitle + "<br><br>Inventory coming soon!"                         
                           };  
                          $(function() {            
                              $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');                
                          });  
                         } else if (drawerId >= 241 && drawerId < 253) {
                          cabLayer.popupTemplate = {
                              title: "<h6>Shelf: " + shelfId,
                              content: "Description: " + drawerTitle + "<br><br>Inventory coming soon!"
                          } 
                          $(function() {            
                              $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');                
                          });  
                        } else {
                          cabLayer.popupTemplate = {
                            title: "<h6>File Cabinet Drawer : " + fileCabId,
                            content: "Description: " + drawerTitle + "<br><br>Inventory coming soon!" 
                          }
                          $(function() {            
                              $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');                
                          });  
                        }
                         table.clearData();
                         $('#results').html("Inventory coming soon!");                         
                       } else {
                         // show the cabinet info div
                         $("#drawerTitle").show(); 
                         $("#maxResults").hide();
                         console.log(data.features);
                         // Sort data array by MAP_ORDER value for call numbers
                         data.features.sort(function(a, b){return a.attributes.MAP_ORDER-b.attributes.MAP_ORDER});
                         // Get the features from the REST API 
                         features = data.features;                                                    
                         var numResults = data.features.length;
                         var startCallNo = data.features[0].attributes.CALL_NUM;
                         var endCallNo = data.features[numResults - 1].attributes.CALL_NUM;   
                         var shelfName = data.features[0].attributes.LOC_TYPE;                          
                          
                         console.log(data.features[0].Feature_Type); 
                         if (drawerId >= 241 && drawerId < 253) {
                            $('#drawerTitle').html("Shelf " + shelfId + ": " + shelfName);
                            cabLayer.popupTemplate = {
                            title: "<b><h6>Shelf " + shelfId + "</b>",
                            content: "<b><h7>Description:</b> "  + drawerTitle + "<br><br><b>Item Count:</b> " + numResults +
                            "<br><br><b>Range:</b> " + startCallNo + " - " + endCallNo,           
                            actions: [tableViewerAction] // adds the custom popup action
                            };            
                          } else if (drawerId < 241) {
                            $('#drawerTitle').html("Drawer " + drawerId + ": " + drawerTitle);
                            cabLayer.popupTemplate = {
                            title: "<b><h6>Drawer " + drawerId + "</b>" ,
                            content: "<b><h7>Description:</b> "  + drawerTitle + "<br><br><b>Item Count:</b> " + numResults +
                            "<br><br><b>Range:</b> " + startCallNo + " - " + endCallNo,           
                            actions: [tableViewerAction] // adds the custom popup action
                            };            
                          } else if (drawerId >= 253 && drawerId <= 260) {
                            $('#drawerTitle').html("Cabinet Drawer " + fileCabId + ": " + drawerTitle);
                            cabLayer.popupTemplate = {
                            title: "<b><h6>Cabinet Drawer " + fileCabId + "</b>" ,
                            content: "<b><h7>Description:</b> "  + drawerTitle + "<br><br><b>Item Count:</b> " + numResults +
                            "<br><br><b>Range:</b> " + startCallNo + " - " + endCallNo,           
                            actions: [tableViewerAction] // adds the custom popup action
                            };            
                          } else if (drawerId >= 261) {
                            $('#drawerTitle').html(shelfName + ": " + drawerTitle);
                            cabLayer.popupTemplate = {
                            title: "<b><h6>" + shelfName + "</b>" ,
                            content: "<b><h7>Description:</b> "  + drawerTitle + "<br><br><b>Item Count:</b> " + numResults +
                            "<br><br><b>Range:</b> " + startCallNo + " - " + endCallNo,           
                            actions: [tableViewerAction] // adds the custom popup action
                            };            
                          }                                                          

                         $('#results').html(numResults + " items"); 
                         
                         // Change the table header width according to text size 	
            						 if (drawerTitle.length > 22) {
            							document.getElementById("title").style.height = "10%";
            							document.getElementById("drawers-table").style.height = "calc(90% - 56px)";
            						 } else {
            							document.getElementById("title").style.height = "7%";
            							document.getElementById("drawers-table").style.height = "calc(93% - 56px)";
            						 }
                         // clear any existing data in the table upon a new drawer click
                         table.clearData();
                         // if the sidebar is open, remove the 'view item list' button   
                         if (document.getElementById('mySidebar').style.width == "25%") {
                          view.popup.viewModel.allActions.getItemAt(0).visible = false;
                          $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');
                          // set the table data to the results of the query
                          table.setData(features);
                          table.redraw();
                          table.setGroupBy("attributes.LOC_ID");
                          $(function() {
                             table.setSort("attributes.MAP_ORDER", "asc");
                          });                                
                         } else {
                          view.popup.viewModel.allActions.getItemAt(0).visible = true; 
                          $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '56px');
                         }                      
                       }
                      }
              });   
            }
          });
      }); //end map click
    });
  }); // end of view   

  // Change the appearance of the popup based on which layer is selected
  view.when(function () {
    // Watch for when features are selected
    view.popup.watch("selectedFeature", function (graphic) {
      if (graphic) {
        if (graphic.layer.title == cabTitle) {
          $(function() {            
              $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '55px');                 
        });
        } else  if (graphic.layer.title != cabTitle) {
          $(function() {            
              $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');                
        });
        }              
      }
    })
  });

  function highLightDrawers (results) {
    var objectIds = [];

    results.forEach(function(result) {
      // the result of the REST API Query
      var drawers = result.attributes.LOC_ID;    
      var titles = result.attributes.DRAWER_TITLE; 
      objectIds.push(drawers);
    });

    var occurrences = { };
    for (var i = 0, j = objectIds.length; i < j; i++) {
       occurrences[objectIds[i]] = (occurrences[objectIds[i]] || 0) + 1;
    }

    console.log(occurrences);   

    var uniqueIds = [...new Set(objectIds)];
    var recCount = results.length;
    var drawerCount = uniqueIds.length;
    console.log(objectIds);
    console.log(uniqueIds);
    var drawerQuery = uniqueIds.join(" OR LOC_ID = ");
    console.log(drawerQuery);
    var cabLayer = webscene.allLayers.filter(function(elem) {
        return elem.title === cabTitle;
      }).items[0];        
      var query = cabLayer.createQuery();
      // Query the cabinets layer for the LOC_ID
      query.where = "LOC_ID = " + drawerQuery;
      query.returnGeometry = true;               
      query.returnZ = true;
      query.outFields = ["OBJECTID", "LOC_ID", "Z_Min", "Z_Max"];
      cabLayer.queryFeatures(query)
        .then(function(response){
            console.log(response);
            var objIds = [];
           // returns a feature set with features containing an OBJECTID
           var objectID = response.features[0].attributes.OBJECTID;
           var feature = response.features;
           feature.forEach(function(feature) {
            var ids = feature.attributes.OBJECTID;
            objIds.push(ids);
           });
           console.log(objIds);
           //var cabId = response.features[0].attributes.CAB_ID;
           var zmin = (response.features[0].attributes.Z_Min / 3.28);
           var zmax = (response.features[0].attributes.Z_Max / 3.28);
          
           view.whenLayerView(cabLayer).then(function(layerView) {
              var queryExtent = new Query({
                objectIds: [objIds]
              });
              // zoom to the extent of drawer that is clicked on the table  
              var new_ext = new Extent({
                xmin: response.features[0].geometry.extent.xmin, 
                ymin: response.features[0].geometry.extent.ymin, 
                zmin: zmin,
                xmax: response.features[0].geometry.extent.xmax, 
                ymax: response.features[0].geometry.extent.ymax,
                zmax: zmax,                        
                spatialReference: { wkid: 4326 }
              });

              cabLayer.queryExtent(queryExtent).then(function(result) {                
                view.goTo({
                center: new_ext.expand(14),
               // zoom: 13,
                tilt: 67.85,
                heading: 38.82
                }, {speedFactor: 0.5 });                        
              });
              
              // if any, remove the previous highlights
              if (highlight) {
                highlight.remove();
              }
              // highlight the feature with the returned objectId
              highlight = layerView.highlight(objIds);
              })
              // open a popup at the drawer location of the selected map
              view.popup.open({
                // Set the popup's title to the coordinates of the clicked location                          
                title: "<h6><b>" + recCount + " items in " + drawerCount + " locations", 
                content: "Results shown in the sidebar. Click any record for more information.",
                location: response.features[0].geometry.centroid,// Set the location of the popup to the clicked location                      
              });              
              // reduce the popup size  
              $(function() {            
                  $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');                
              });
         });
  }

  // Code for the search bar functions
  $( "#submit" ).click(function() {
    view.popup.close();
    table.clearData();
   // $(".esri-icon-table").show();
    // get the value of the search box
    var searchVal = $( "#search" ).val();
    // get the value of the search type dropdown
    var typeVal = $( "#searchtype" ).val();
    if (typeVal == 'Keyword') {
      // call to query the REST API using the value of the search
      $.ajax({
              dataType: 'json',
              url: tableURL + 'query?where=TITLE+LIKE+%27%25' + searchVal + '%25%27+OR+THEME+LIKE+%27%25' + searchVal + '%25%27+OR+Geo+LIKE+%27%25' + searchVal +'%25%27+OR+DATE+LIKE+%27%25' + searchVal + '%25%27+OR+PUBLISHER+LIKE+%27%25' + searchVal + '%25%27+OR+AUTHOR+LIKE+%27%25' + searchVal + '%25%27+OR+SCALE+LIKE+%27%25' + searchVal + '%25%27+OR+LANG+LIKE+%27%25' + searchVal + '%25%27+OR+TAGS+LIKE+%27%25' + searchVal + '%25%27&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
              type: "GET",    
              success: function(data) {
               if (data.features.length == 0) {
                alert('The search returned no results. Please try different terms.');
               } else {                     
                 // hide the cabinet info div
                 $("#drawerTitle").hide(); 
                 console.log(data.features);
                 // Get the features from the REST API 
                 var searchRes = data.features;  
                // $('#drawerModal').modal('show');
                 openNav(); 
                 // Get the number of results of the search
                 var numResults = data.features.length;   
                 if (numResults >= 1000) {
                 	document.getElementById("title").style.height = "10%";
					document.getElementById("drawers-table").style.height = "calc(90% - 56px)";						
                   $("#maxResults").show();
                 } else {
                 	document.getElementById("title").style.height = "7%";
					document.getElementById("drawers-table").style.height = "calc(93% - 56px)";	
                   $("#maxResults").hide();
                 }

                 // Truncate the search string if needed
				 if (searchVal.length > 25) {
				 	var shortSearchVal = (searchVal.substring(0, 25) + "...");
				 $('#results').html(numResults + " items found for " + '"' + shortSearchVal + '"'); 
				 } else {
				 	$('#results').html(numResults + " items found for " + '"' + searchVal + '"'); 
				 }
                                  
                 // Create a new table with the array of features 
                 table.setData(searchRes);
                 console.log(searchRes);
                 highLightDrawers(searchRes);
                 table.setSort("attributes.LOC_ID", "asc")
                 table.setGroupBy("attributes.LOC_ID");
                 table.redraw(true);
                }
              }
      });  
    } else if (typeVal == 'Call Number') {            
      // call to query the REST API using the value of the search
      $.ajax({
              dataType: 'json',
              url: tableURL + 'query?where=CALL_NUM+LIKE+%27%25' + searchVal + '%25%27&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
              type: "GET",    
              success: function(data) {
                $("#maxResults").hide();
                if (data.features.length == 0) {
                  alert('The search returned no results. Please try different terms.');
                } else {
                 // hide the cabinet info div
                 $("#drawerTitle").hide();  
                 console.log(data.features);
                 // Get the features from the REST API 
                 var searchRes = data.features;  
                 openNav();  
                 var numResults = data.features.length;    
                 $('#results').html(numResults + " items found for " + '"' + searchVal + '"');
                 document.getElementById("title").style.height = "7%";
				 document.getElementById("drawers-table").style.height = "calc(93% - 56px)";	
                 // Create a new table with the array of features 
                 table.setData(searchRes);
                 highLightDrawers(searchRes);
                 table.setSort("attributes.LOC_ID", "asc")
                 table.setGroupBy("attributes.LOC_ID");
                 table.redraw(true);
                }
              }
      });  
    } else if (typeVal == 'SQL') {
    	console.log('searchVal');
      // call to query the REST API using the value of the search
      $.ajax({
              dataType: 'json',
              url: tableURL + 'query?where=' + searchVal + '&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
              type: "GET",    
              success: function(data) {
                $("#maxResults").hide();
                if (data.features.length == 0) {
                  alert('The search returned no results. Please try different terms.');
                } else {
                 // hide the cabinet info div
                 $("#drawerTitle").hide();  
                 console.log(data.features);
                 // Get the features from the REST API 
                 var searchRes = data.features;  
                 openNav();  
                 var numResults = data.features.length;    
                 $('#results').html(numResults + " items found for SQL Query.");
                 document.getElementById("title").style.height = "7%";
				 document.getElementById("drawers-table").style.height = "calc(93% - 56px)";	
                 // Create a new table with the array of features 
                 table.setData(searchRes);
                 highLightDrawers(searchRes);
                 table.setSort("attributes.LOC_ID", "asc")
                 table.setGroupBy("attributes.LOC_ID");
                 table.redraw(true);
                }
              }
      }); 
    } 
  });

 // if users hits enter perform the search   
 $( "#search" ).keyup(function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("submit").click();
    }        
 }); 

  // Code for the search dropdown menu
  $("#searchtype").change(function () {
    // Get the value of the selected item
    var value = this.value;
    if (value == 'Keyword') {
      $('#search').attr("placeholder", "Search items...");
    } else if (value == 'Call Number') {
       $('#search').attr("placeholder", "Enter Call # (ie: G3300 1818 .H4 REF)");            
    } else if (value == 'SQL') {
      //$('#yearModal').modal('show');
      $('#search').attr("placeholder", "Enter SQL string."); 
    } else if (value == 'Location') {            
      $('#search').attr("placeholder", "Search location (ie: Arizona)"); 
    } else if (value == 'Theme') {            
      $('#search').attr("placeholder", "Search by theme (ie: Land use)"); 
    } else if (value == 'Advanced') {       
      $('#advancedModal').modal('show');
    }
  });

   // Code to populate the Advanced Search Dropdown Menus
   // Populate the Theme dropdown item
   $.ajax({
            dataType: 'json',
            url: tableURL + 'query?where=1%3D1&objectIds=&time=&resultType=none&outFields=THEME&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=true&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
            type: "GET",    
            success: function(data) {
              var themeSelect = document.getElementById('theme');
              var features = data.features;

               // remove null values from features
              features = features.filter(function (el) {              	
  				return el.attributes.THEME != null;
			  }); 

              // sort values in alphabetical order	
              features.sort(function(a,b){              	
    			return a.attributes.THEME.localeCompare(b.attributes.THEME);
			  })

              Object.values(features).forEach(function(value) {
                if (value.attributes.THEME !== null) {                                         
                  var themeVal = value.attributes.THEME;
                  var themeOpt = document.createElement("option");
                  themeOpt.textContent = themeVal;
                  themeOpt.value = themeVal;
                  themeSelect.appendChild(themeOpt); 
                }                                        
              });                     
            }
    }); 
   
   // Populate the Language dropdown item
   $.ajax({
            dataType: 'json',
            url: tableURL + 'query?where=1%3D1&objectIds=&time=&resultType=none&outFields=LANG&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=true&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
            type: "GET",    
            success: function(data) {
              var langSelect = document.getElementById('language');
              var features = data.features;    

               // remove null values from features
              features = features.filter(function (el) {              	
  				return el.attributes.LANG != null;
			  }); 

              // sort values in alphabetical order	
              features.sort(function(a,b){              	
    			return a.attributes.LANG.localeCompare(b.attributes.LANG);
			  })

              Object.values(features).forEach(function(value) {
                if (value.attributes.LANG !== null) {                                          
                  var langVal = value.attributes.LANG;
                  var langOpt = document.createElement("option");
                  langOpt.textContent = langVal;
                  langOpt.value = langVal;
                  langSelect.appendChild(langOpt); 
                }                                        
              });                     
            }
    });
   // Populate the format dropdown item
   $.ajax({
            dataType: 'json',
            url: tableURL + 'query?where=1%3D1&objectIds=&time=&resultType=none&outFields=FORMAT&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=true&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
            type: "GET",    
            success: function(data) {
              var formatSelect = document.getElementById('format');
              var features = data.features;
              // remove null values from features
              features = features.filter(function (el) {              	
  				return el.attributes.FORMAT != null;
			  }); 

              // sort values in alphabetical order	
              features.sort(function(a,b){              	
    			return a.attributes.FORMAT.localeCompare(b.attributes.FORMAT);
			  })
  
              Object.values(features).forEach(function(value) { 
                if (value.attributes.FORMAT !== null) {                                         
                  var formatVal = value.attributes.FORMAT;
                  var formatOpt = document.createElement("option");
                  formatOpt.textContent = formatVal;
                  formatOpt.value = formatVal;
                  formatSelect.appendChild(formatOpt); 
                }                                        
              });                     
            }
    });

  // Function to rotate the map
  function rotate() {         
    view.goTo({
        heading: view.camera.heading + 0.2,
        center: view.center
    }, {animate: false});
    // begin the rotation
    var req = requestAnimationFrame(rotate);            
    // when the user clicks on the pause button
    pauseBtn.addEventListener('click', function(event){  
      // cancel the rotation
      cancelAnimationFrame(req);
      $(".esri-icon-play").show(); 
      $(".esri-icon-pause").hide();     
    })
  }; 

  // Custom Buttons
  // Home button
  var homeBtn = new Home({
    view: view
  });

  // Add the home button to the top left corner of the view
  view.ui.add(homeBtn, "top-left");         
  
  // If the advanced search is closed, change the search value back to Keyword
  $('#advancedModal').on('hidden.bs.modal', function (e) {
    $('#searchtype')
      .val('Keyword')
      .trigger('change');
  })

  // Rotate play button
  var rotateBtn = document.createElement('div');        
  rotateBtn.className = "esri-icon-play esri-widget--button esri-widget esri-interactive";
  rotateBtn.title = "Auto-rotate map";
  rotateBtn.addEventListener('click', function(event){
    rotate();
    $(".esri-icon-play").hide();
    $(".esri-icon-pause").show();         
  })

  // Add the button to the UI
  view.ui.add(rotateBtn, "top-left");

  // Pause button
  var pauseBtn = document.createElement('div');
  pauseBtn.className = "esri-icon-pause esri-widget--button esri-widget esri-interactive";
  pauseBtn.title = "Pause rotation";

  // Add the button to the UI
  view.ui.add(pauseBtn, "top-left"); 

  $(".esri-icon-pause").hide();

  // Add element for the 360 photo viewer button using Esri widgets
  var viewerBtn = document.createElement('div');
  viewerBtn.className = "esri-icon-media esri-widget--button esri-widget esri-interactive";
  viewerBtn.title = "View 360 Hub photo";
  viewerBtn.addEventListener('click', function(event){
    // Toggle panorama
    $('#viewerModal').modal('show');
    document.getElementById("pano").src="https://cdn.pannellum.org/2.5/pannellum.htm#config=https://mapgeoasu.github.io/3dexplorer/tour.json&autoLoad=true";
  })

  // Add the button to the UI
  view.ui.add(viewerBtn, "top-left"); 

  // Add element for the information button using Esri widgets
  var infoBtn = document.createElement('div');
  infoBtn.className = "esri-icon-description esri-widget--button esri-widget esri-interactive";
  infoBtn.title = "Information";
  infoBtn.addEventListener('click', function(event){
    // Toggle infowindow modal
    $('#infoModal').modal('show');
  })

  // Add the button to the UI
  view.ui.add(infoBtn, "top-left"); 

  /*// Add element for the table button using Esri widgets
  var tableBtn = document.createElement('div');
  tableBtn.className = "esri-icon-table esri-widget--button esri-widget esri-interactive";
  tableBtn.title = "Open table";
  tableBtn.addEventListener('click', function(event){
    // Toggle table
    $('#drawerModal').modal('show');
  })

  // Add the button to the UI
  view.ui.add(tableBtn, "top-left"); 
  // Hide the button by default  
  $(".esri-icon-table").hide();        */

  // when someone clicks the advanced search submit button        
  $("#advancedBtn").click(function(){
    table.clearData();
    view.popup.close();
    // create an empty array for search strings
    var searchStrings = [];
    // get the values of the boxes from the advanced search modal
    var keyVal = $("#key").val();
    var themeVal = $("#theme").val();
    var langVal = $('#language').val();
    var geoVal = $("#location").val();
    var formatVal = $('#format').val();
    var authorVal = $('#author').val();
    var pubVal = $('#publisher').val();
    var startYearVal = $("#startYear").val();
    var endYearVal = $("#endYear").val();
    // Title, geo, theme, date, publisher, author, lang, tags  
    console.log(keyVal, themeVal, langVal, geoVal, authorVal, pubVal, startYearVal, endYearVal);
    // if the search boxes are blank print error message
    if (keyVal == "" && themeVal == 'Select Theme' && langVal == 'Select Language' && geoVal == "" && authorVal == "" 
      && pubVal == "" && startYearVal == "" && endYearVal == "" && formatVal == 'Select Format') {
      alert('Please select or enter a value for at least one search field.')
    } else if (startYearVal != "" && endYearVal == "" || startYearVal == "" && endYearVal != "") {
      alert('Please enter a value for both Start Year and End Year');
    } else {
       if (keyVal != "") {              
        var keyString = "(TITLE LIKE " + "'%" + keyVal + "%' OR GEO LIKE " + "'%" + keyVal + "%' OR THEME LIKE " + "'%" + keyVal + "%'" +
        " OR DATE LIKE " + "'%" + keyVal + "%' OR PUBLISHER LIKE " + "'%" + keyVal + "%' OR AUTHOR LIKE " + "'%" + keyVal + "%'" +
        " OR LANG LIKE " + "'%" + keyVal + "%' OR TAGS LIKE " + "'%" + keyVal + "%')"; 
        searchStrings.push(keyString);                      
      }		
      if (themeVal != 'Select Theme') {              
        var themeString = "THEME = " + "'" + themeVal + "'"; 
        searchStrings.push(themeString);                      
      }
      if (langVal != 'Select Language') {              
        var langString = "LANG = " + "'" + langVal + "'"; 
        searchStrings.push(langString);                         
      }
      if (geoVal != "") {              
        var geoString = "GEO LIKE " + "'%" + geoVal + "%'";
        searchStrings.push(geoString);                   
      }
      if (formatVal != 'Select Format') {              
        var formatString = "FORMAT = " + "'" + formatVal + "'";
        searchStrings.push(formatString);                   
      }
      if (authorVal != "") {              
        var authorString = "AUTHOR LIKE " + "'%" + authorVal + "%'"; 
        searchStrings.push(authorString);                    
      }
      if (pubVal != "") {              
        var pubString = "PUBLISHER LIKE " + "'%" + pubVal + "%'"; 
        searchStrings.push(pubString);                      
      }
      if (startYearVal != "" && endYearVal != "" ) {              
        var dateString = "DATE BETWEEN " + "'" + startYearVal + "' AND " + "'" + endYearVal + "'";
        searchStrings.push(dateString);                    
      }
      // join the search strings from the array
      var queryString = searchStrings.join(" AND ");
      console.log(queryString);

      // call to the rest api with the search string
      $.ajax({
              dataType: 'json',
              url: tableURL + 'query?where=' + queryString + '&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
              type: "GET",    
              success: function(data) {
                console.log(data);
                var advancedRes = data.features;
                table.setData(advancedRes); 
                highLightDrawers(advancedRes); 
                table.setSort("attributes.LOC_ID", "asc")
                table.setGroupBy("attributes.LOC_ID");
                table.redraw(true);
                var numResults = advancedRes.length;
                if (numResults == 0) {
                  alert('The search returned no results. Please try different terms.');
                } else {
                  if (numResults >= 1000) {
                  	document.getElementById("title").style.height = "10%";
					document.getElementById("drawers-table").style.height = "calc(90% - 56px)";	
                    $("#maxResults").show();
                  } else {
                  	document.getElementById("title").style.height = "7%";
					document.getElementById("drawers-table").style.height = "calc(93% - 56px)";
                    $("#maxResults").hide();
                  }   
                $('#results').html(numResults + " items found for advanced search");   
                $("#drawerTitle").hide();  
                openNav();
                $('#advancedModal').modal('hide'); 
                }                                                             
              }                     
          });       
    }      
  });

  // check if the years are valid numbers
  $('#startYear').change(function() {
    $(this).val($(this).val().match(/\d*\.?\d+/));
  });

  $('#endYear').change(function() {
    $(this).val($(this).val().match(/\d*\.?\d+/));
  });

  // close button of the sidebar 
  // when someone clicks the advanced search submit button        
  $(".closebtn").click(function(){
    closeNav();
  });

  // Popup Actions        
  // remove the zoom-to popup action  
  view.popup.actions = [];
  // popup action for maps
  var tableViewerAction = {
    // This text is displayed as a tooltip
    title: "View item list",
    // The ID by which to reference the action in the event handler
    id: "view-table",
    // Sets the icon font used to style the action button
    className: "esri-icon-collection"
  };  

  var returnToAction = {
    // This text is displayed as a tooltip
    title: "Return to results",
    // The ID by which to reference the action in the event handler
    id: "return-to",
    // Sets the icon font used to style the action button
    className: "esri-icon-table"
  };   

   var nextAction = {
    // This text is displayed as a tooltip
    title: "Next",
    // The ID by which to reference the action in the event handler
    id: "next-record",
    // Sets the icon font used to style the action button
    className: "esri-icon-collection"
  };  

  // This event fires for each click on any action
  view.popup.on("trigger-action", function(event){
    // If the view image action is clicked, open the table modal
    if(event.action.id === "view-table"){
      openNav();
      table.setData(features);     
      table.setGroupBy("attributes.LOC_ID"); 
      $(function() {
        table.setSort("attributes.MAP_ORDER", "asc");
      });     
      table.redraw(true);
    }
    if(event.action.id === "return-to"){
      $('#drawerModal').modal('show');  
      table.redraw(true);
    }
    if(event.action.id === "next-record"){
       var selected = table.getSelectedRows();
    console.log(selected);
    var nextRow = selected[0].getNextRow();
    selected[0].deselect();
    nextRow.select();
    getRowData(nextRow);
    var scroll = document.getElementsByClassName('tabulator-selected')[0];
    scroll.scrollIntoView();
    if (nextRow == false) {
                  console.log(false);
                  console.log(view.popup.actions);
                  view.popup.viewModel.actions.getItemAt(2).visible = false;
                
                }
    }
  }); 
}); // end of map JS
