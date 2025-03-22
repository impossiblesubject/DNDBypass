import { Plugin } from "@vencord/entities";
import { settings } from "@vencord/api";
import { findByProps } from "@vencord/webpack";

const Notifications = findByProps("showNotification");
const StatusStore = findByProps("status", "isMobileOnline");
const ContextMenuAPI = findByProps("openContextMenu");
const UserContextMenus = findByProps("UserContextMenu");

export default class DNDBypass extends Plugin {
  async start() {
    this.patchedMessages = this.patcher.before("showNotification", Notifications, ([notification]) => {
      if (!notification || !notification.message || !notification.userId) return;
      
      const isDND = StatusStore.status === "dnd";
      const bypassList = settings.get("dndBypassList", []);
      
      if (isDND && bypassList.includes(notification.userId)) {
        return true; // Allow the notification
      }
      return false; // Block if in DND and user not in bypass list
    });
    
    this.patcher.after(UserContextMenus, "default", (_, [props], returnValue) => {
      const userId = props.user?.id;
      if (!userId) return;
      
      const bypassList = settings.get("dndBypassList", []);
      const isBypassed = bypassList.includes(userId);
      
      const toggleBypass = () => {
        const newList = isBypassed ? bypassList.filter(id => id !== userId) : [...bypassList, userId];
        settings.set("dndBypassList", newList);
      };
      
      returnValue.props.children.push(
        ContextMenuAPI.buildMenuItem({
          label: isBypassed ? "Remove from DND Bypass" : "Add to DND Bypass",
          action: toggleBypass
        })
      );
    });
  }

  stop() {
    this.patchedMessages();
  }
}
