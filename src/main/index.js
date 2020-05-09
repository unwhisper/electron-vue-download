import { app, BrowserWindow, ipcMain } from 'electron'
//import { autoUpdater } from 'electron-updater'
import Update from '../../static/update'
const Store = require('electron-store');

const store = new Store();
const request = require('request')
const adm_zip = require('adm-zip')
const packageJson = require('../../package.json')

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

const md5 = require('js-md5');
//nodejs中的path模块
const path=require('path');
const fs = require('fs')

// 初始化更新类型和下载保存地址
let updateType = store.get('updateType')
if(!store.has('updateType') || !updateType) {
  store.set('updateType','auto')
}
let downloadPath = store.get('downloadPath')
if(!store.has('downloadPath') || !downloadPath) {
  store.set('downloadPath',app.getPath('downloads'))
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`
  
function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
    webPreferences: {
      nodeIntegration: true
    }
  })

  //版本更新
  const update = new Update(mainWindow)
  ipcMain.on("checkForUpdate", () => {
    if (process.env.NODE_ENV !== 'development') {
      //执行自动检查更新
      checkVersion()
    }
  })

  ipcMain.on('update',(event, arg) => {
    console.log(arg)
    if(arg == 'update') {
      update.autoUpdate()
    }else if(arg == 'autoCheckUpdate') {
      update.autoCheckUpdate()
    }else if(arg == 'handCheckUpdate') {
      update.handCheckUpdate()
    }
  })

  function  checkVersion() {
    return new Promise((resolve, reject) => {
      request(
        {
          url: packageJson.upgrade.url + 'package.json?v=' + new Date().getTime(),//请求package.json，与本地对比版本号
        },
        (error, res, body) => {
          try {
            if (error || res.statusCode !== 200) {
              throw '更新版本号失败，请联系管理员';
            }
            const json = JSON.parse(body);
            const { version, description, upgrade } = json
            const localCoreVersion = packageJson.version
            const localVersion = packageJson.upgrade.version
            const onlineCoreVersion = version
            const onlineVersion = upgrade.version
            // console.log(localCoreVersion, localVersion, onlineCoreVersion, onlineVersion)
            if(onlineCoreVersion > localCoreVersion) {
              update.checkUpdate()
            }else{
              if(onlineVersion > localVersion) {
                mainWindow.webContents.send('hotUpdate');
              }
              console.log('no update')
            }
          } catch (err) {
            reject(err);
          }
        })
    })
  }
    
  ipcMain.on('hotUpdateNow', (event, arg) => {
    downLoad()
  })

  var downloadItems = new Map();

  function getDownloadItem(downloadpath) {
    if(downloadItems.has(md5(downloadpath))){
      var item = downloadItems.get(md5(downloadpath));
      return item;
    }else{
      return false;
    }
  }

    /**
   * 更新
   */
  function downLoad(){
    const baseUrl = './resources/'
    const fileUrl = packageJson.upgrade.url
    const stream = fs.createWriteStream(`${baseUrl}dist.zip`);
    const url = `${fileUrl}dist.zip?v=${new Date().getTime()}`;
    request(url).pipe(stream).on('close', () => {
      const unzip = new adm_zip(`${baseUrl}dist.zip`);   //下载压缩更新包
      unzip.extractAllTo(`${baseUrl}`, true);   //解压替换本地文件
      fs.unlink(`${baseUrl}dist.zip`, function() {})
      mainWindow.webContents.send('upgradeSuccess')
    });
  }

  //主进程代码
  let downloadUrl
  let folderpath
  let command
  ipcMain.on('download', (evt, args) => {
      let url = JSON.parse(args);
      downloadUrl = url.downloadUrl
      folderpath = url.savePath
      command = url.command

      //开始下载
      if(command === 'startDownload') {
          mainWindow.webContents.downloadURL(downloadUrl);
          return ;
      }

      //暂停下载
      if(command === 'stopDownload') {
          var item = getDownloadItem(downloadUrl);
          if(item && !item.isPaused()){
              item.pause();
              return ;
          }
      }

      //恢复下载
      if(command === 'resumeDownload') {
          var item = getDownloadItem(downloadUrl);
          if(item && item.isPaused()) {
              item.resume();
              return ;
          }
      }

      //取消下载
      if(command === 'cancelDownload') {
        var item = getDownloadItem(downloadUrl);
        if(item){
          item.cancel();
          downloadItems.delete(md5(item.getURL()))
          return ;
        }
      }   
  });

  mainWindow.webContents.session.on('will-download', async (event, item) => {
    const fileName = item.getFilename();
    const url = item.getURL();
    const time = item.getStartTime();
    const startTime = time.toString().split('.')[0]
    const initialState = item.getState();
    const downloadPath = store.get('downloadPath')
 
    let fileNum = 0;
    let savePath = path.join(downloadPath, fileName);
 
    // savePath基础信息
    const ext = path.extname(savePath);
    const name = path.basename(savePath, ext);
    const dir = path.dirname(savePath);
 
    // 文件名自增逻辑
    while (fs.existsSync(savePath)) {
      fileNum += 1;
      savePath = path.format({
        dir: dir,
        ext: ext,
        name: `${name}(${fileNum})`,
      });
    }
 
    // 设置下载目录，阻止系统dialog的出现
    item.setSavePath(savePath);
    // 通知渲染进程，有一个新的下载任务
    mainWindow.webContents.send('new-download-item', {
      savePath,
      url,
      startTime,
      state: initialState,
      paused: item.isPaused(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes(),
      progressShow: true
    });

    item.on('updated', (event, state) => {
      mainWindow.webContents.send('download-item-updated', {
        startTime,
        state,
        totalBytes: item.getTotalBytes(),
        receivedBytes: item.getReceivedBytes(),
        paused: item.isPaused()
      });
      if (state === 'interrupted') {
        console.log('下载中断但可以恢复！')
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('下载已暂停')
        } else {
          /* downloadItem.getTotalBytes()
          返回Integer- 下载项目的总大小（以字节为单位）。

          如果大小未知，则返回0。

          downloadItem.getReceivedBytes()
          返回Integer- 下载项目的接收字节数。 */
          //console.log(`Received bytes: ${item.getReceivedBytes()}`)
          let download_percent = ((item.getReceivedBytes()/item.getTotalBytes())*100).toFixed(2);
          console.log(download_percent+'%');
          mainWindow.webContents.send('tips',download_percent);
        }
      }
    })
    item.once('done', (event, state) => {
      mainWindow.webContents.send('download-item-done', {
        startTime,
        state,
        progressShow: false
      });
      if (state === 'completed') {
        console.log('下载完成！')
        console.log(item.getSavePath())
        downloadItems.delete(md5(item.getURL()))
        mainWindow.webContents.send('tips', '下载完成')
        mainWindow.webContents.send('file', item.getSavePath())
      } else {
        console.log(`下载失败: ${state}`)
      }
    })
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)
app.allowRendererProcessReuse = false

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */
// 监听检查更新出错事件
/* autoUpdater.autoDownload = false; //默认true，禁止自动更新
autoUpdater.setFeedURL('http://127.0.0.1/electron/download/') // 更新地址与package.json中的build.publish.url相对应

autoUpdater.on('error', function (error) {
  sendUpdateMessage('检查更新出错');
});
// 监听正在检查更新事件
autoUpdater.on('checking-for-update', function () {
  sendUpdateMessage('正在检查更新……');
});
// 监听不需要更新事件
autoUpdater.on('update-not-available', function (info) {
  sendUpdateMessage('已经是最新版本' + info.version);
});
// 监听需要更新事件
autoUpdater.on('update-available', function (info) {
  mainWindow.webContents.send('updateAvailable', '<h3>检测到新版本' + info.version + '，是否升级？</h3>');//+ info.releaseNotes
});
// 监听下载进度事件
autoUpdater.on('download-progress', function (progressObj) {
  mainWindow.webContents.send('downloadProgress', progressObj);
})
//监听下载完成事件
autoUpdater.on('update-downloaded', function (info) {
  //监听渲染线程中用户是否应用更新
  ipcMain.on('isUpdateNow', () => {
      autoUpdater.quitAndInstall();
  });
  mainWindow.webContents.send('isUpdateNow');
});
//监听渲染线程中用户是否同意下载
ipcMain.on("isDownload", () => {
  autoUpdater.downloadUpdate();
})

ipcMain.on("checkForUpdate", () => {
  if (process.env.NODE_ENV !== 'development') {
      //执行自动检查更新
      autoUpdater.checkForUpdates();
  }
})

function sendUpdateMessage(text) {
mainWindow.webContents.send('message', text);
} */