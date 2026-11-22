package co.playrift.music

import rift.ecs.System
import rift.packages.RiftPackage
import rift.packages.on_command
import rift.packages.on_login
import rift.packages.on_music_ended
import rift.packages.on_ui_component_click
import rift.ui.UIName

public object MusicPackage : RiftPackage {
  override val systems: List<System<*, *>> = emptyList()

  override fun load() {
    val tab = UIName(MusicTab.INTERFACE)

    on_login { actor -> MusicTab.atLogin(actor) }

    on_music_ended { subject -> subject.musicEnded(track) }

    on_ui_component_click(tab.component(MusicTab.TRACK_LIST)) { subject -> MusicTab.rowClicked(this, subject) }

    on_ui_component_click(tab.component(MusicTab.PLAYING_TRACK)) { subject -> MusicTab.playingTrackClicked(this, subject) }

    on_ui_component_click(tab.component(MusicTab.PLAYLIST_MENU)) { subject -> MusicTab.playlistMenuClicked(this, subject) }

    on_ui_component_click(tab.component(MusicTab.AREA_BUTTON)) { subject -> subject.setMusicMode(MusicMode.Area) }

    on_ui_component_click(tab.component(MusicTab.SHUFFLE_BUTTON)) { subject -> subject.setMusicMode(MusicMode.Shuffle) }

    on_ui_component_click(tab.component(MusicTab.SINGLE_BUTTON)) { subject -> subject.setMusicMode(MusicMode.Single) }

    on_ui_component_click(tab.component(MusicTab.SKIP_BUTTON)) { subject -> subject.skipMusic() }

    on_command("music", ::MusicCommand)
  }
}
