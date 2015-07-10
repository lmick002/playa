"use babel"

var _ = require('lodash')
var assign = require('object-assign')
var groove = require('groove')
var uid = require('uid')

var AppDispatcher = require('../dispatcher/AppDispatcher')
var EventEmitter = require('events').EventEmitter
var OpenPlaylistConstants = require('../constants/OpenPlaylistConstants')

var AlbumPlaylist = require('../util/AlbumPlaylist')

var CHANGE_EVENT = 'change'

var _playlists = []
var _selectedIndex = -1
var _activeIndex = -1

var _selectPlaylist = function(playlist, index){
  _selectedIndex = index
  playa.playlistLoader.load(playlist).then((playlist)=>{
    console.info('Selected ' + playlist.id)
    OpenPlaylistStore.emitChange()  
  })
}

var _getSelectedPlaylist = function(){
  return _playlists[_selectedIndex]
}

var _getAt = function(index){
  return _playlists[index]
}

var OpenPlaylistStore = assign({}, EventEmitter.prototype, {
  getAll: function(){
    return _playlists
  },
  
  getAt: function(index){
    return _playlists[index]
  },
  
  getSelectedIndex: function(){
    return _selectedIndex
  },
  
  getSelectedPlaylist: function(){
    return _playlists[_selectedIndex]
  },  

  getActiveIndex: function(){
    return _activeIndex
  },
  
  emitChange: function(){
    this.emit(CHANGE_EVENT)
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback){
    this.on(CHANGE_EVENT, callback)
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback){
    this.removeListener(CHANGE_EVENT, callback)
  },
  
  dispatcherIndex: AppDispatcher.register(function(action) {
    switch(action.actionType) {
      case OpenPlaylistConstants.SELECT_PLAYLIST:
        var playlist = _getAt(action.selected)
        if(playlist){
          _selectPlaylist(playlist, action.selected)
        }
        break
      case OpenPlaylistConstants.SELECT_PLAYLIST_BY_ID:
        var index = _.findIndex(_playlists, { id: action.id })
        var playlist = _getAt(index)
        if(playlist){
          _selectPlaylist(playlist, index)
        }
        break           
      case OpenPlaylistConstants.ADD_PLAYLIST:
        var newPlaylists = _.difference(action.playlists.map( i => i.id), _playlists.map(i => i.id))
        _playlists = _playlists.concat(action.playlists.filter((p)=>{
          return newPlaylists.indexOf(p.id) > -1
        }))
        OpenPlaylistStore.emitChange()
        break
      case OpenPlaylistConstants.SAVE_PLAYLIST:
        var playlist = _getSelectedPlaylist()
        if(playlist){
          playa.playlistLoader.save(playlist).then((file)=>{
            console.info('Saved ' + playlist.id)
            OpenPlaylistStore.emitChange()
          })
        }        
        break
      case OpenPlaylistConstants.ADD_FOLDER:
        var playlist = _getSelectedPlaylist()
        if(action.folder && playlist) {
          playlist.addFolder(action.folder).then(()=>{
            OpenPlaylistStore.emitChange()  
          }).catch((err)=>{
            console.error(err.stack)
          })  
        }        
        break
      case OpenPlaylistConstants.PLAY_ALBUM:
        var playlist = _playlists[action.playlist.id]
        if(action.playlist.id !== _activeIndex){
          _activeIndex = action.playlist.id          
        }
        playa.player.userPlaylist = action.playlist
        playa.player.playAlbum(action.album, action.trackId)
        break        
      case OpenPlaylistConstants.REMOVE_FILES:
        var playlist = _getSelectedPlaylist()
        if(playlist){
          _getSelectedPlaylist().removeItems(action.ids)
        }
        break        
      case OpenPlaylistConstants.CLOSE_PLAYLIST:
        var playlist = _getSelectedPlaylist()
        if(playlist){
          playlist.clear()
          _playlists = _playlists.filter((p)=>{
            return p !== playlist
          })
          var nexPlaylist = _getAt(_selectedIndex -1)
          if(nexPlaylist){
            _selectPlaylist(nexPlaylist, _selectedIndex-1)  
          }else{
            OpenPlaylistStore.emitChange()
          }
          
        }
        break
      case OpenPlaylistConstants.REORDER_PLAYLIST:
        var playlist = _.findWhere(_playlists, { id: action.id })
        if(playlist){
          playlist.reorder(action.from, action.to)
          OpenPlaylistStore.emitChange()
        }        
        break
    }

    return true // No errors. Needed by promise in Dispatcher.
  })  
    
})

module.exports = OpenPlaylistStore