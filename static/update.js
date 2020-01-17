import { autoUpdater } from 'electron-updater'
import { ipcMain } from 'electron'
/**
 * -1 检查更新失败 0 正在检查更新 1 检测到新版本，准备下载 2 未检测到新版本 3 下载中 4 下载暂停 5 下载暂停恢复 6 下载完成 7 下载失败 8 取消下载
 * */
class Update {
  mainWindow
  message = {
    error: '检查更新出错',
    checking: '正在检查更新……',
    updateNotAva: '你当前使用的是最新版本',
  };
  constructor (mainWindows) {
    this.mainWindow = mainWindows
    //https://www.kuk.ink/application/
    //http://127.0.0.1/electron/download/
    autoUpdater.setFeedURL('http://127.0.0.1/electron/download/') // 更新地址与package.json中的build.publish.url相对应
    /**
    * 根据自身需求选择下方方法
    */
    /* this.error()
    this.start()
    this.allow()
    this.unallowed()
    this.listen()
    this.download() */
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
    autoUpdater.on('checking-for-update', () => {
      this.Message(this.message.checking)
    })
  }

  auto_allow () { // 自动更新时，发现可更新数据时
    autoUpdater.on('update-available', (info) => {
      //this.mainWindow.webContents.send('updateAvailable', '<h3>检测到新版本' + info.version + '，是否升级？</h3>');
    })
  }

  check_allow () { // 检测更新时，发现可更新数据时
    autoUpdater.on('update-available', (info) => {
      this.mainWindow.webContents.send('updateAvailable', '<h3>检测到新版本' + info.version + '，是否升级？</h3>');
    })
  }

  unallowed () { // 没有可更新数据时
    autoUpdater.on('update-not-available', (info) => {
      this.Message(this.message.updateNotAva + info.version)
    })
  }

  listen () { // 下载监听
    autoUpdater.on('download-progress', (progressObj) => {
      this.mainWindow.webContents.send('downloadProgress', progressObj)
    })
  }

  download_success () { //监听下载完成事件
    autoUpdater.on('update-downloaded', () => {
      //监听渲染线程中用户是否应用更新
      ipcMain.on('isUpdateNow', () => {
        autoUpdater.quitAndInstall();
      });
      this.mainWindow.webContents.send('isUpdateNow');
    })
  }

  isAllow_download() {//监听渲染线程中用户是否同意下载
    ipcMain.on("isDownload", () => {
      autoUpdater.downloadUpdate();
    })
  }

  checkUpdate() {
    ipcMain.on("checkForUpdate", () => {
      /* if (process.env.NODE_ENV !== 'development') {
          //执行自动检查更新
          autoUpdater.checkForUpdates();
      } */
      autoUpdater.checkForUpdates();
    })
  }

  autoUpdate () { // 自动更新
    this.error()
    this.auto_allow()
    this.listen()
    this.download_success()
    this.isAllow_download()
    this.checkUpdate()
  }

  autoCheckUpdate() { //自动检测新版本
    this.error()
    this.check_allow()
    this.listen()
    this.download_success()
    this.isAllow_download()
    this.checkUpdate()
  }

  handCheckUpdate() { //手动检测新版本
    this.error()
    this.check_allow()
    this.unallowed()
    this.listen()
    this.download_success()
    this.isAllow_download()
    this.checkUpdate()
  }
}
export default Update