package co.playrift.ui.default

import org.tinylog.kotlin.Logger
import rift.components.Disconnecting
import rift.ecs.System
import rift.entities.Actor
import rift.entities.Entity
import rift.packages.RiftPackage
import rift.packages.on_login
import rift.packages.on_ui_component_click
import rift.ts2.UI
import rift.ts2.Ts2
import rift.ui.UIName
import rift.ui.UserInterface

/** The default UI. */
public object DefaultUiPackage : RiftPackage {
  /** The toplevel a new player starts with. */
  public const val TOPLEVEL: String = "resizable"

  private const val CHAT_SLOT: String = "chat"
  private const val PRIVATE_CHAT_SLOT: String = "chat.split"
  private const val INVENTORY_SLOT: String = "tab.inventory"
  private const val WORN_ITEMS_SLOT: String = "tab.worn"
  private const val FRIENDS_SLOT: String = "tab.friends"
  private const val LOGOUT_SLOT: String = "tab.logout"
  private const val ORBS_SLOT: String = "orbs"

  private const val TOGGLE_OPTION = 1

  private val slotsAlreadyReportedMissing = HashSet<String>()

  override val systems: List<System<*, *>> = emptyList()

  override fun load() {
    val missingNames = Ts2.missingNames()
    check(missingNames.isEmpty()) { "rift.ui.default: the served ts2 build has not got ${missingNames.size} name(s) it uses: ${missingNames.take(10).joinToString()}" }

    on_login { actor ->
      openPanelsAtLogin(actor)
    }

    on_ui_component_click(UI.Logout.button) { subject ->
      requestLogout(subject)
    }

    on_ui_component_click(UI.Friends.ignore) { subject ->
      if (option == TOGGLE_OPTION) toggleFriendIgnoreList(subject, UI.Friends)
    }

    on_ui_component_click(UI.Ignore.friends) { subject ->
      if (option == TOGGLE_OPTION) toggleFriendIgnoreList(subject, UI.Ignore)
    }
  }

  private fun openPanelsAtLogin(actor: Actor) {
    val userInterface = actor.findComponent<UserInterface>() ?: actor.addComponent(UserInterface())
    if (userInterface.chosenToplevel == null) userInterface.chosenToplevel = TOPLEVEL

    openInSlot(userInterface, CHAT_SLOT, UI.Chatbox)
    openInSlot(userInterface, PRIVATE_CHAT_SLOT, UI.PmChat)
    openInSlot(userInterface, ORBS_SLOT, UI.Orbs)

    openInSlot(userInterface, INVENTORY_SLOT, UI.Inventory)
    openInSlot(userInterface, WORN_ITEMS_SLOT, UI.Wornitems)
    openInSlot(userInterface, FRIENDS_SLOT, UI.Friends)
    openInSlot(userInterface, LOGOUT_SLOT, UI.Logout)
  }

  private fun openInSlot(userInterface: UserInterface, slot: String, panel: UIName) {
    try {
      userInterface.openOverlay(panel, into = slot)
    } catch (exception: IllegalArgumentException) {
      val firstReport = slotsAlreadyReportedMissing.add(slot)
      if (firstReport) Logger.warn("default UI: {}", exception.message)
    }
  }

  private fun requestLogout(subject: Entity) {
    val alreadyDisconnecting = subject.hasComponent<Disconnecting>()
    if (!alreadyDisconnecting) subject.addComponent(Disconnecting())
  }

  private fun toggleFriendIgnoreList(subject: Entity, clickedList: UIName) {
    val otherList = if (clickedList == UI.Friends) UI.Ignore else UI.Friends

    val userInterface = subject.findComponent<UserInterface>()
    if (userInterface == null) return

    val slot = userInterface.slotOf(clickedList)
    if (slot == null) return

    userInterface.openOverlay(otherList, into = slot)
  }
}
