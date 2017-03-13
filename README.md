# MusicalSolarSystem
A website written with basic JavaScript (using the MIDI.js library) which turns loop-based compositions into a visual solar system representation.

Hosted at: https://kirbyfreak29.github.io/MusicalSolarSystem/

Written in JavaScript for a Graphics Programming class project, the program takes an original composition I wrote for a Sound Design class and visually represents it as a solar system.  Each instrument rotates around the time signature.  The measures (equal to the length of the loop) rotate around each instrument.  The notes for each measure rotate around the corresponding measure.  The rotation speed of everything in the system is calculated based on the BPM of the song.  No full MIDI files are played, instead the notes are played dynamically based on their position: each measure plays when it passes the top of the instrument, and each note in a playing measure is played when it passes the top of the measure.

Future Plans: 
- Import song through JSON instead of hard coding
- Create functionality to import other songs
- Possibly add ability to convert MIDI files into my JSON format
