import { autoUpdater } from 'electron-updater'
/**
 * -1 检查更新失败 0 正在检查更新 1 检测到新版本，准备下载 2 未检测到新版本 3 下载中 4 下载暂停 5 下载暂停恢复 6 下载完成 7 下载失败 8 取消下载
 * */
class Update {
  mainWindow
  message = {
    error: '检查更新出错',
    checking: '正在检查更新……',
    updateAva: '检测到新版本，正在下载……',
    updateNotAva: '你当前使用的是最新版本',
    downloadSuccess: '下载完成准备更新'
  };
  constructor (mainWindows) {
    this.mainWindow = mainWindows
    autoUpdater.setFeedURL('http://127.0.0.1/electron/download/') // 更新地址与package.json中的build.publish.url相对应
    /**
    * 根据自身需求选择下方方法
    */
    this.error()
    this.start()
    this.allow()
    this.unallowed()
    this.listen()
    this.download()
  }
  Message (msg) {
    this.mainWindow.webContents.send('message', msg)
  }
  error () { // 当更新发生错误的时候触发。
    autoUpdater.on('error', (err) => {
      this.Message(this.message.error)
      console.log(err)
    })
  }
  start () { // 当开始检查更新的时候触发
    autoUpdater.on('checking-for-update', (event, arg) => {
      this.Message(this.message.checking)
    })
  }
  allow () { // 发现可更新数据时
    autoUpdater.on('update-available', (event, arg) => {
      this.Message(this.message.updateAva)
    })
  }
  unallowed () { // 没有可更新数据时
    autoUpdater.on('update-not-available', (event, arg) => {
      this.Message(this.message.updateNotAva)
    })
  }
  listen () { // 下载监听
    autoUpdater.on('download-progress', (progressObj) => {
      this.mainWindow.webContents.send('downloadProgress', progressObj)
    })
  }
  download () { // 下载完成
    autoUpdater.on('update-downloaded', () => {
      this.Message(this.message.downloadSuccess)
      setTimeout(m => {
        autoUpdater.quitAndInstall()
      }, 1000)
    })
  }
  load () { // 触发器
    autoUpdater.checkForUpdates()
  }
}
export default Update