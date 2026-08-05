// ツールバーのアイコンをクリックしたときに、現在のタブに対してサイドパネルを開く動作にする。
// これにより、どのサイト・どのタブを見ていても同じサイドパネル(進捗ビューアー)を呼び出せる。
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("[progress-tracker sidepanel] setPanelBehavior failed:", error));
