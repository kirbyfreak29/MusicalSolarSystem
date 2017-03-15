/*
 * Created for CS352, Calvin College Computer Science
 *
 * Tyler Luce -- March 2017
 */

var music = { }
var moon, stars, earth, venus, mercury;
var timeSignature, whole, half, quarter, eighth, sixteenth, dottedHalf, dottedQuarter, dottedEighth, quarterTiedToDottedEighth, dottedHalfTiedToSixteenth, quarterTiedToSixteenth;
var intervalID, time=0, step=1;
// "acoustic_bass", "pad_2_warm", "pad_5_bowed", "lead_5_charang", "music_box"
var instrumentNames = ["woodblock", "acoustic_bass", "music_box", "pad_2_warm"];
var instrumentPictures = [];
var midiInstruments = {}
var midi; // to have the MIDI object stored in it
var song; // to have the song stored in it
var bpm = 115;
var wiggle = 0;
var beatsPerMeasure = 4;
var measuresPerLoop = 8;
var millisecondsPerStep = 20;

window.ondevicemotion = function(event) {
  var accelerationX = event.accelerationIncludingGravity.x;
  var accelerationY = event.accelerationIncludingGravity.y;
  var accelerationZ = event.accelerationIncludingGravity.z;
  
  if (accelerationX != null) {
    wiggle += accelerationX;

    if (wiggle <= -10) {
      wiggle = -10
    }
    if (wiggle >= 10) {
      wiggle = 10
    }
  }
}

// MEASURING NOTES IN 16ths! i.e 4 = quarter note, 8 = half note, 2 = eight note
function Note(pitch, noteLength, instrumentChannel, isChord) {
  if (Array.isArray(pitch)) {
    this.note = []
    for(var i = 0; i < pitch.length; i++) {
      this.note.push(MIDI.keyToNote[pitch[i]]);
    }
  } else {
    this.note = MIDI.keyToNote[pitch];
  }
  this.noteLength = noteLength;
  this.instrumentChannel = instrumentChannel;
  this.isChord = isChord
  this.lastDegreesRotated = 0;
  this.initialRotation = true;
  this.measureCurrentlyPlaying = false;
  this.size = 20;

  switch(noteLength) {
    case 1:
      this.picture = sixteenth;
      break;
    case 2:
      this.picture = eighth;
      break;
    case 3:
      this.picture = dottedEighth;
      break;
    case 4:
      this.picture = quarter;
      break;
    case 5:
      this.picture = quarterTiedToSixteenth;
      break;
    case 6:
      this.picture = dottedQuarter;
      break;
    case 7:
      this.picture = quarterTiedToDottedEighth;
      break;
    case 8:
      this.picture = half;
      break;
    case 12:
      this.picture = dottedHalf;
      break;
    case 13:
      this.picture = dottedHalfTiedToSixteenth;
      break;
    case 16:
      this.picture = whole;
      break;
    default:
      this.picture = timeSignature;
  }

  this.play = function() {
    var velocity = 127; // how hard the note hits
    var duration = 1.0 / (bpm / 60.0) * (this.noteLength / 4.0); // converts the note length into seconds
    if (this.isChord) {
      midi.chordOn(this.instrumentChannel, this.note, velocity, 0);
      midi.chordOff(this.instrumentChannel, this.note, duration);
    } else {
      midi.noteOn(this.instrumentChannel, this.note, velocity, 0);
      midi.noteOff(this.instrumentChannel, this.note, duration);
    }

    this.measureCurrentlyPlaying = false;
  }

  this.display = function(degreesRotated) {
    music.cx.rotate(90*(Math.PI/180))
    var ratio = this.picture.width/this.picture.height;
    if (this.size > 20) {
      this.size -= 1;
    }

    // Play note if it passes the top position
    if (this.initialRotation) {
      this.lastDegreesRotated = degreesRotated;
      this.initialRotation = false;
    }
    if ( ( ((degreesRotated + 90) % 360) < ((this.lastDegreesRotated + 90) % 360) ) && (this.measureCurrentlyPlaying)) {
      this.play();
      this.size = 40;
      music.cx.drawImage(this.picture, 0 - this.size*ratio/2, 0 - this.size, this.size*ratio, this.size);
    } else {
      music.cx.drawImage(this.picture, 0 - this.size*ratio/2, 0 - this.size, this.size*ratio, this.size);
    }
    this.lastDegreesRotated = degreesRotated;
  }
}

function Measure(instrumentChannel) {
  this.instrumentChannel = instrumentChannel;
  this.notes = [];
  this.lastDegreesRotated = 0;
  this.initialRotation = true;
  this.size = 13;

  this.newNote = function(pitch, noteLength, isChord) {
    this.notes.push(new Note(pitch, noteLength, this.instrumentChannel, isChord))
  }

  this.display = function(degreesRotated) {
    music.cx.rotate(90*(Math.PI/180))
    var ratio = measure.width/measure.height;

    if (this.size > 13) {
      this.size -= 1;
    }

    // Play note if it passes the top position
    if (this.initialRotation) {
      this.lastDegreesRotated = degreesRotated;
      this.initialRotation = false;
    }

    if ( (degreesRotated % 360) < (this.lastDegreesRotated % 360)  ) {

      for(var i = 0; i < this.notes.length; i++) {
        this.size = 25;
        this.notes[i].measureCurrentlyPlaying = true;
      }
    }
    this.lastDegreesRotated = degreesRotated;

    music.cx.drawImage(measure, 0 - measure.width/2, 0 - measure.height/2, this.size*ratio, this.size);

    var degreesAlreadyMoved = 0;

    for(var i = this.notes.length - 1; i >= 0; i--) {
      music.cx.save();

      var rotationSpeed = ((360/(beatsPerMeasure/(bpm/60)))/(1000/millisecondsPerStep))*time
      var spacingOffset = (this.notes[i].noteLength*(360.0/16) + degreesAlreadyMoved) - (-270 - 1)

      degreeToRotate = rotationSpeed + spacingOffset;
      degreesAlreadyMoved += this.notes[i].noteLength*(360.0/16);
      music.cx.rotate(degreeToRotate*(Math.PI/180));
      music.cx.translate(20 + wiggle, 0);
      this.notes[i].display(degreeToRotate);
      music.cx.restore();
    }
  }
}

function Instrument(name, picture) {
  this.name = name;
  this.measures = [];
  this.channel = instrumentNames.indexOf(name);
  this.picture = picture;
  this.size = 84

  this.newMeasure = function() {
    this.measures.push(new Measure(this.channel))
  }

  this.display = function() {
    var ratio = this.picture.width/this.picture.height;
    // music.cx.rotate(90*(Math.PI/180))
    music.cx.drawImage(this.picture, 0 - this.picture.width/2, 0 - this.picture.height/2, this.size*ratio, this.size);
    for(var i = 0; i < this.measures.length; i++) {
      music.cx.save();

      var rotationSpeed = ((360/((measuresPerLoop*beatsPerMeasure)/(bpm/60)))/(1000/millisecondsPerStep)) * time
      var spacingOffset = -(360/this.measures.length * (i + 1)) - (360*5 - 1);
      degreeToRotate = rotationSpeed + spacingOffset;

      music.cx.rotate(degreeToRotate*(Math.PI/180));
      music.cx.translate(80 + wiggle, 0);
      this.measures[i].display(degreeToRotate);
      music.cx.restore();
    }
    music.cx.restore();
  }
}

function Song() {
  this.instruments = [];

  this.newInstrument = function(name, picture) {
    this.instruments.push(new Instrument(name, picture))
  }

  this.display = function() {
    music.cx.drawImage(timeSignature, 0 - timeSignature.width/4, 0 - timeSignature.height/4, 100, 100); // for every 100 added to width, divide by one less 2 (200 = 2, 100 = 4)

    music.cx.save();
    for(var i = 0; i < instrumentNames.length; i++) {
      music.cx.save();

      degreeToRotate = ((((360/instrumentNames.length)/((measuresPerLoop*beatsPerMeasure)/(bpm/60)))/(1000/millisecondsPerStep)) * time + 360/instrumentNames.length * i) - (180 + 10);
      music.cx.rotate(degreeToRotate*(Math.PI/180))
      music.cx.translate(160 + wiggle,0);
      music.cx.save();
      this.instruments[i].display();
      music.cx.restore();
    }
  }
}

$(document).ready(function () { music.init(); });

music.init = function () { 

  // Possible info on doing this here: https://codepen.io/KryptoniteDove/post/load-json-file-locally-using-pure-javascript

  // var songJSON = $.getJSON("glyc.json");
  // console.log(songJSON)

  music.prepareInstruments(); 
  // music.prepareSong();

  music.canvas  = $('#canvas1')[0];
  music.cx = music.canvas.getContext('2d');
  music.cx.fillStyle = 'rgb(255,0,0)';

  music.cx.setTransform(1,0,0,1,360,270);	// world frame is (-1,-1) to (1,1)

  // bind functions to events, button clicks
  $('#gobutton').bind('click', music.go);
  $('#stopbutton').bind('click', music.stop);
  $('#stepbutton').bind('click', music.step);
  $('#slider1').bind('input', music.slider);
}

music.prepareInstruments = function() {
  
    MIDI.loadPlugin({
    soundfontUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/",
    instruments: instrumentNames,
    onprogress: function(state, progress) {
      console.log(state, progress);
    },
    onsuccess: function() {
      var delay = 0; // play one note every quarter second
      var note = 50; // the MIDI note
      var velocity = 127; // how hard the note hits

      for(var i = 0; i < instrumentNames.length; i++) {
        MIDI.programChange(i, MIDI.GM.byName[instrumentNames[i]].number);
        console.log(instrumentNames[i], MIDI)
      }

      midi = MIDI;
      music.loadImages();
      timeSignature.onload = function() { music.prepareSong(); }
    }
  });
  
}

music.prepareSong = function() {
  // Setup song
  song = new Song();

  // Setup instruments
  for(var i = 0; i < instrumentNames.length; i++) {
    song.newInstrument(instrumentNames[i], instrumentPictures[i])
  }

  // Setup Measures
  for(var i = 0; i < song.instruments.length; i++) {
    for(var j = 0; j < 8; j++) {
      song.instruments[i].newMeasure()
    }
  }

  // Set up the rhythm instrument
  var currentInstrument = song.instruments[0];
  var currentMeasure = currentInstrument.measures[0];
  for(var i = 0; i < measuresPerLoop; i++) {
    var currentMeasure = currentInstrument.measures[i];
    currentMeasure.newNote('D5', 2, false);
    currentMeasure.newNote('E5', 1, false);
    currentMeasure.newNote('D5', 2, false);
    currentMeasure.newNote('D5', 1, false);
    currentMeasure.newNote('E5', 1, false);
    currentMeasure.newNote('D5', 1, false);
    currentMeasure.newNote('D5', 2, false);
    currentMeasure.newNote('E5', 1, false);
    currentMeasure.newNote('D5', 2, false);
    currentMeasure.newNote('D5', 1, false);
    currentMeasure.newNote('E5', 1, false);
    currentMeasure.newNote('D5', 1, false);
  }


  // Set up the bass instrument
  currentInstrument = song.instruments[1];
  var currentMeasure = currentInstrument.measures[0];
  currentMeasure.newNote('D3', 3, false);
  currentMeasure.newNote('D3', 5, false);
  currentMeasure.newNote('D3', 3, false);
  currentMeasure.newNote('D3', 5, false);

  var currentMeasure = currentInstrument.measures[1];
  currentMeasure.newNote('Db3', 3, false);
  currentMeasure.newNote('Db3', 5, false);
  currentMeasure.newNote('Db3', 3, false);
  currentMeasure.newNote('Db3', 5, false);

  var currentMeasure = currentInstrument.measures[2];
  currentMeasure.newNote('C3', 3, false);
  currentMeasure.newNote('C3', 5, false);
  currentMeasure.newNote('C3', 3, false);
  currentMeasure.newNote('Db3', 3, false);
  currentMeasure.newNote('C3', 2, false);

  var currentMeasure = currentInstrument.measures[3];
  currentMeasure.newNote('B2', 3, false);
  currentMeasure.newNote('B2', 5, false);
  currentMeasure.newNote('B2', 3, false);
  currentMeasure.newNote('B2', 5, false);

  var currentMeasure = currentInstrument.measures[4];
  currentMeasure.newNote('Bb2', 3, false);
  currentMeasure.newNote('Bb2', 5, false);
  currentMeasure.newNote('Bb2', 3, false);
  currentMeasure.newNote('Bb2', 5, false);

  var currentMeasure = currentInstrument.measures[5];
  currentMeasure.newNote('Ab2', 3, false);
  currentMeasure.newNote('Ab2', 5, false);
  currentMeasure.newNote('Ab2', 3, false);
  currentMeasure.newNote('Bb2', 3, false);
  currentMeasure.newNote('Ab2', 2, false);

  var currentMeasure = currentInstrument.measures[6];
  currentMeasure.newNote('Gb2', 3, false);
  currentMeasure.newNote('Gb2', 5, false);
  currentMeasure.newNote('Gb2', 3, false);
  currentMeasure.newNote('Gb2', 3, false);
  currentMeasure.newNote('B2', 2, false);

  var currentMeasure = currentInstrument.measures[7];
  currentMeasure.newNote('C3', 3, false);
  currentMeasure.newNote('C3', 5, false);
  currentMeasure.newNote('C3', 3, false);
  currentMeasure.newNote('C3', 5, false);


  // Set up the lead synth instrument
  currentInstrument = song.instruments[2];
  var currentMeasure = currentInstrument.measures[0];
  currentMeasure.newNote('D5', 3, false);
  currentMeasure.newNote(['F5', 'A5'], 7, true);
  currentMeasure.newNote('A5', 1, false);
  currentMeasure.newNote('Bb5', 1, false);
  currentMeasure.newNote('A5', 2, false);
  currentMeasure.newNote('G5', 2, false);

  var currentMeasure = currentInstrument.measures[1];
  currentMeasure.newNote('Db5', 3, false);
  currentMeasure.newNote(['E5', 'G5'], 13, true);

  var currentMeasure = currentInstrument.measures[2];
  currentMeasure.newNote('C5', 3, false);
  currentMeasure.newNote(['E5', 'G5'], 7, true);
  currentMeasure.newNote('G5', 1, false);
  currentMeasure.newNote('Ab5', 1, false);
  currentMeasure.newNote('G5', 2, false);
  currentMeasure.newNote('F5', 2, false);

  var currentMeasure = currentInstrument.measures[3];
  currentMeasure.newNote('B4', 3, false);
  currentMeasure.newNote(['D5', 'F5'], 13, true);

  var currentMeasure = currentInstrument.measures[4];
  currentMeasure.newNote('Bb4', 3, false);
  currentMeasure.newNote(['D5', 'F5'], 7, true);
  currentMeasure.newNote('F5', 1, false);
  currentMeasure.newNote('Gb5', 1, false);
  currentMeasure.newNote('F5', 2, false);
  currentMeasure.newNote('Eb5', 2, false);

  var currentMeasure = currentInstrument.measures[5];
  currentMeasure.newNote('Ab4', 3, false);
  currentMeasure.newNote(['C5', 'Eb5'], 7, true);
  currentMeasure.newNote('Eb5', 1, false);
  currentMeasure.newNote('F5', 1, false);
  currentMeasure.newNote('Eb5', 2, false);
  currentMeasure.newNote('Db5', 2, false);

  var currentMeasure = currentInstrument.measures[6];
  currentMeasure.newNote('Gb4', 3, false);
  currentMeasure.newNote(['Bb4', 'Db5'], 7, true);
  currentMeasure.newNote('Db5', 1, false);
  currentMeasure.newNote('Eb5', 1, false);
  currentMeasure.newNote('Db5', 2, false);
  currentMeasure.newNote('B4', 2, false);

  var currentMeasure = currentInstrument.measures[7];
  currentMeasure.newNote('C5', 8, false);
  currentMeasure.newNote('F5', 8, false);


  // Set up the background synth instrument
  currentInstrument = song.instruments[3];
  var currentMeasure = currentInstrument.measures[0];
  currentMeasure.newNote(['D5', 'F5', 'A5'], 16, true);

  var currentMeasure = currentInstrument.measures[1];
  currentMeasure.newNote(['Db5', 'E5', 'G5'], 16, true);

  var currentMeasure = currentInstrument.measures[2];
  currentMeasure.newNote(['C5', 'E5', 'G5'], 16, true);

  var currentMeasure = currentInstrument.measures[3];
  currentMeasure.newNote(['B4', 'D5', 'F5'], 16, true);

  var currentMeasure = currentInstrument.measures[4];
  currentMeasure.newNote(['Bb4', 'D5', 'F5'], 16, true);

  var currentMeasure = currentInstrument.measures[5];
  currentMeasure.newNote(['Ab4', 'C5', 'Eb5'], 16, true);

  var currentMeasure = currentInstrument.measures[6];
  currentMeasure.newNote(['Gb4', 'Bb4', 'Db5'], 16, true);

  var currentMeasure = currentInstrument.measures[7];
  currentMeasure.newNote(['F4', 'A4', 'C5'], 16, true);

  console.log(song);

  music.animate();
}

music.animate = function() {
  // Note makes a full rotation in 16 sixteenth notes
  // Measure makes a full rotation in the number of measures * 4 beats?
  // Instrument just kinda... spins?

  time += step;
  timefrac = time/10;
  $('#timecount').text(time);

  music.cx.clearRect(-music.canvas.width/2, -music.canvas.height/2, music.canvas.width, music.canvas.height);

  song.display();
}

music.go = function() {
  clearInterval(intervalID);
  intervalID =  setInterval(music.animate, millisecondsPerStep); // in milliseconds

  var delay = 0; // play one note every quarter second
  var note = 50; // the MIDI note
  var velocity = 0; // how hard the note hits

  midi.noteOn(0, note, velocity, 0);
  midi.noteOff(0, note, .1);
}
  
music.stop = function() { clearInterval(intervalID); }

music.step = function() {
  $('#messageWindow').prepend("...step " + step + "<br>");
  music.animate();
}  
  
music.loadImages = function() {

  whole = new Image();  whole.src = "images/whole.png"
  half = new Image();  half.src = "images/half.png"
  quarter = new Image();  quarter.src = "images/quarter.png"
  eighth = new Image();  eighth.src = "images/eighth.png"
  sixteenth = new Image();  sixteenth.src = "images/sixteenth.png"
  dottedHalf = new Image();  dottedHalf.src = "images/dotted-half.png"
  dottedQuarter = new Image();  dottedQuarter.src = "images/dotted-quarter.png"
  dottedEighth = new Image();  dottedEighth.src = "images/dotted-eighth.png"
  quarterTiedToDottedEighth = new Image();  quarterTiedToDottedEighth.src = "images/quarter-tied-to-dotted-eighth.png"
  dottedHalfTiedToSixteenth = new Image();  dottedHalfTiedToSixteenth.src = "images/dotted-half-tied-to-sixteenth.png"
  quarterTiedToSixteenth = new Image();  quarterTiedToSixteenth.src = "images/quarter-tied-to-sixteenth.png"
  // dottedSixteenth = new Image();  dottedSixteenth.src = "images/dotted-sixteenth.png"

  for(var i = 0; i < instrumentNames.length; i++) {
    var newImage = new Image();
    newImage.src = "images/" + instrumentNames[i] + ".png";
    instrumentPictures.push(newImage);
  }

  measure = new Image();  measure.src = "images/measure.png"
  timeSignature = new Image();  timeSignature.src = "images/timeSig.png"
}

music.slider = function(ev) { 
  $('#pointcount').text($('#slider1').val()); 
  wiggle = parseInt($('#slider1').val());
}
