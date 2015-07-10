"use babel"

var _ = require('lodash')
var React = require('react')
var ReactPropTypes = React.PropTypes
var DragSource = require('react-dnd').DragSource
var DropTarget = require('react-dnd').DropTarget
var cx = require('classnames')
var shell = require('shell')
var moment = require('moment')
require("moment-duration-format")

const albumSource = {
  beginDrag(props) {
    return {
      id: props.itemKey,
      originalIndex: props.index
    }
  },
  endDrag(props, monitor) {
    const { id: droppedId, originalIndex } = monitor.getItem()
    const didDrop = monitor.didDrop()
    if (!didDrop) {
      props.moveAlbum(droppedId, originalIndex)
    }
  }  
}

const albumTarget = {
  drop(props, monitor) {
    const draggedId = monitor.getItem().id
    if (draggedId !== props.id) {
      props.moveAlbum(draggedId, props.itemKey)
    }
  },
  hover(props, monitor, component) {
    _.forEach(document.querySelectorAll('.drag-over'), e => e.classList.remove('drag-over') )
    React.findDOMNode(component).classList.add('drag-over')
  }
}

var AlbumPlaylistItem = React.createClass({
  getInitialState: function(){
    return {
      cover: null
    }
  },
  formatTime: function(time){
    return moment.duration(time, "seconds").format("mm:ss", { trim: false })
  },  
  componentWillMount: function(){
    playa.coverLoader.load(this.props.album)
      .then(this.updateCover)
      .catch((err)=>{})
  },
  renderTracklist: function(){
    return (
      <ul className="list-unstyled tracklist">
      { this.props.album.tracks.map( (track, index) => this.renderTrack(track, index) )}
      </ul>
    )
  },
  renderTrack: function(track, index){
    var isPlaying = track.id == this.props.currentItem.id
    var classes = cx({
      'track' : true,
      'playing' : isPlaying
    })    
    var title = this.props.album.isCompilation() ? (track.metadata.artist + ' - ' + track.metadata.title) : track.metadata.title
    return (
      <li className={classes} key={track.id} onDoubleClick={this.handleTracklistDoubleClick} data-id={track.id}>
        <span className="track-playing-indicator">{ isPlaying ? <i className="fa fa-fw fa-volume-up"></i> : null }</span>
        <span className="track-number">{ track.metadata.track }.</span>
        <span className="track-title">{ title }</span>
        <span className="track-duration">{ this.formatTime(track.duration) }</span>
      </li>
    )
  },
  render: function() {
    var isPlaying = this.props.album.contains(this.props.currentItem.id)    
    var classes = cx({
      'album' : true,
      'playing' : isPlaying,
      'selected' : this.props.isSelected,
      'open': this.props.isOpened
    })
    var opacity = this.props.isDragging ? 0 : 1
    var coverStyle = this.state.cover ? { backgroundImage: 'url(' + this.state.cover + ')'} : {}
    
    var coverClasses = cx({
      'cover' : true,
      'loaded': !!this.state.cover
    })
    return this.props.connectDragSource(this.props.connectDropTarget(
      <div className={classes} onClick={this.handleClick} onDoubleClick={this.handleDoubleClick} data-id={this.props.album.id} style={{opacity}}>
        <header>
          <div className={coverClasses} style={coverStyle}></div>
          <span className="artist">{this.props.album.getArtist()}</span><br/>
          <span className="title">{this.props.album.getTitle()} { (isPlaying && !this.props.isOpened) ? <i className="fa fa-fw fa-volume-up"></i> : null }</span>
          <span className="year">{this.props.album.getYear()}</span>
          <ul className="links list-inline">
            <li>
              <a href={'http://www.discogs.com/search?type=all&q=' + encodeURIComponent(this.props.album.getArtist()) + ' ' + this.props.album.getTitle()}
                onClick={this.handleExternalLinkClick}>Discogs</a>
              </li>
          </ul>
        </header>
        { this.props.isOpened ? this.renderTracklist() : null }
      </div>
    ))
  },
  handleTracklistDoubleClick: function(event){
    event.stopPropagation()
    this.props.handleDoubleClick(this.props.album, event.target.dataset.id)
  },
  handleDoubleClick: function(event){
    this.props.handleDoubleClick(this.props.album, this.props.album.tracks[0].id)
  },
  handleClick: function(event){
    this.props.handleClick(event, this)
  },
  handleExternalLinkClick: function(event){
    event.preventDefault()
    shell.openExternal(event.currentTarget.href)
  },
  updateCover: function(cover){
    this.setState({ cover: cover })
  }
})

AlbumPlaylistItem = DropTarget('ALBUM', albumTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}))(AlbumPlaylistItem)

AlbumPlaylistItem = DragSource('ALBUM', albumSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
}))(AlbumPlaylistItem)

module.exports = AlbumPlaylistItem