var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.SchemaTypes.ObjectId;
var slug = require('mongoose-slug');
var _ = require('underscore');
var util = require('../util');

// this defines the fields associated with the model,
// and moreover, their type.
var RoomSchema = new Schema({
    name:        { type: String , required: true }
  , description: { type: String }
  , _creator:    { type: ObjectId, ref: 'Person' }
  , _owner:      { type: ObjectId, ref: 'Person' }
  , created:     { type: Date, default: Date.now }
});

RoomSchema.plugin( slug('name'), {
  required: true
} );
RoomSchema.index({ slug: 1 });

RoomSchema.methods.bind = function( soundtrack ) {
  this.soundtrack = soundtrack;
};
RoomSchema.methods.broadcast = function( msg , GLOBAL ) {
  if (GLOBAL) return this.soundtrack.broadcast( msg );
  
  var room = this;
  var app = room.soundtrack.app;

  var myClients = _.flatten( _.toArray( room.listeners ).map(function(l) {
    return l.ids;
  }) );

  var json = JSON.stringify(msg);
  for (var id in app.clients ) {
    if (~myClients.indexOf( id )) app.clients[id].write(json);
  }
};
RoomSchema.methods.queueTrack = function( track , curator , callback ) {
  var room = this;
  
  Track.findOne({ _id: track._id }).populate('_artist _credits').exec(function(err, realTrack) {
    if (err || !realTrack) return callback('Could not acquire that track.');
    
    var playlistItem = realTrack.toObject();

    playlistItem._artist = {
        _id: playlistItem._artist._id
      , name: playlistItem._artist.name
      , slug: playlistItem._artist.slug
    };

    var playableSources = 0;
    for (var source in playlistItem.sources) {
      for (var i = 0; i < playlistItem.sources[ source ].length; i++) {
        if (['soundcloud', 'youtube'].indexOf( source ) >= 0) playableSources += 1;
        delete playlistItem.sources[ source ][ i ].data;
      }
    }
    
    if (!playableSources) {
      return callback({
          status: 'error'
        , message: 'No playable sources.'
      });
    }
    
    room.playlist.push( _.extend( playlistItem , {
        score: 0
      , votes: {} // TODO: auto-upvote?
      , timestamp: new Date()
      , curator: {
            _id: curator._id
          , username: curator.username
          , slug: curator.slug
        }
    } ) );
    
    room.sortPlaylist();
    
    room.savePlaylist(function() {
      room.broadcast({
        type: 'playlist:add',
        data: track
      });
      return callback();
    });
  });
};
RoomSchema.methods.sortPlaylist = function() {
  var room = this;
  room.playlist = _.union( [ room.playlist[0] ] , room.playlist.slice(1).sort(function(a, b) {
    if (b.score === a.score) {
      return a.timestamp - b.timestamp;
    } else {
      return b.score - a.score;
    }
  }) );
};
RoomSchema.methods.savePlaylist = function( saved ) {
  if (!saved) var saved = new Function();
  var self = this;
  var app = self.soundtrack.app;

  //console.log('saving playlist');
  //console.log('as exists', self.playlist );
  //console.log('as stringified', JSON.stringify( self.playlist ));

  app.redis.set( app.config.database.name + ':rooms:' + self.slug + ':playlist', JSON.stringify( self.playlist ) );
  
  app.rooms[ self.slug ] = self;
  
  saved();
};
RoomSchema.methods.selectTrack = function( gain , failpoint , cb ) {
  var room = this;

  if (typeof(gain) === 'function') {
    var cb = gain;
    var gain = 0;
    var failpoint = 21;
  }
  
  if (typeof(failpoint) === 'function') {
    var cb = failpoint;
    var failpoint = 21;
  }
  
  var query = {};
  
  // must be queued by a real person
  query._curator = { $exists: true };
  // must have been played in this room
  query._room = room._id;
  // must have been queued within the past 7 days
  query = _.extend( query , {
    $or: util.timeSeries('timestamp', 3600*3*1000, 24*60*1000*60, 7 + gain ),
    timestamp: { $lt: (new Date()) - 3600 * 3 * 1000 }
  });
  // but not if it's been played recently!
  // TODO: one level of callbacks to collect this!
  
  // heaven forbid we have nothing.
  // TODO: sane cases.
  if (gain < failpoint) query = {};
  
  Play.find( query ).limit( 4096 ).sort('timestamp').exec(function(err, plays) {
    if (err) console.log(err);
    if (!plays || !plays.length || plays.length < 10) {
      console.log('nothing found. womp.');
      // try again, but with 7 more days included...
      return room.selectTrack( gain + 7 , cb );
    }
  
    var randomSelection = plays[ _.random(0, plays.length - 1 ) ];
    Track.findOne({ _id: randomSelection._track }).populate('_artist').exec( cb );
    
  });

};
RoomSchema.methods.ensureQueue = function(callback) {
  var room = this;
  if (room.playlist.length > 0) return callback();

  room.selectTrack(function(err, track) {
    if (err || !track) return callback( err );
    track.startTime = Date.now();
    // TODO: add score: 0 and votes: {}?
    room.playlist.push( track );
    return callback();
  });
  
};
RoomSchema.methods.nextSong = function( done ) {
  if (!done) var done = new Function();
  var room = this;
  var app = room.soundtrack.app;

  //console.log('old playlist length', room.playlist.length);
  var lastTrack = room.playlist.shift();
  //console.log('lastTrack was', lastTrack);
  //console.log('new playlist length', room.playlist.length);

  room.ensureQueue(function() {
    room.savePlaylist(function() {
      var play = new Play({
        _track: room.track._id,
        _curator: (room.track.curator) ? room.track.curator._id : undefined,
        _room: room._id
      });
      play.save(function(err) {
        //console.log('saved, ', err );
        room.startMusic(function() {
          console.log('nextSong() started music');
          done();
        });
      });
    });
  });
};
RoomSchema.methods.startMusic = function( cb ) {
  var room = this;
  if (!room.playlist[0]) {
    console.log('no playlist');
    return Track.count(function(err, count) {
      if (!count) return cb('no tracks.  new install?  TODO: base set.');
      var rand = Math.floor(Math.random() * count);
      Track.findOne().skip( rand ).exec(function(err, track) {
        room.playlist.push( track );
        room.savePlaylist(function(err) {
          return cb('zero-length playlist.  inserting random');
        });
      });
    });
  }

  room.track = room.playlist[0];
  if (!room.track.startTime) room.track.startTime = Date.now();

  var seekTo = (Date.now() - room.playlist[0].startTime) / 1000;
  
  Track.findOne({ _id: room.track._id }).populate('_artist _artists').lean().exec(function(err, track) {
    if (err || !track) return cb('no such track (severe error)');

    // temporary collect exact matches... 
    // testing for future merging of track data for advances
    var query = { _artist: track._artist._id , title: track.title, _id: { $ne: track._id } };
    Track.find( query ).lean().exec(function(err, tracks) {
      var sources = track.sources;
      tracks.forEach(function(t) {
        for (var source in t.sources) {
          sources[ source ] = _.union( sources[ source ] , t.sources[ source ] );
        }
      });

      room.broadcast({
        type: 'track',
        data: _.extend( room.track , track ),
        sources: sources,
        seekTo: seekTo
      });
      
      clearTimeout( room.trackTimer );
      
      console.log('scheduling nextTrack in', room.track.duration - seekTo )
      room.trackTimer = setTimeout(function() {
        room.nextSong();
      }, (room.track.duration - seekTo) * 1000 );

      return cb();
      
    });
  });
};

var Room = mongoose.model('Room', RoomSchema);

// export the model to anything requiring it.
module.exports = {
  Room: Room
};
