import { app, BrowserWindow, ipcMain } from 'electron'
//import { autoUpdater } from 'electron-updater'
import Update from '../../static/update'

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
const LNDB = require('lndb')
const db = new LNDB('./')

// 初始类型
const update = db.init('updateType')
let updateType = update.get('updateType')
if(!updateType || !updateType.txt) {
  update.set('updateType','auto')
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
    width: 1000
  })

  ipcMain.on('update',(event, arg) => {
    console.log(arg)
    if(arg == 'update') {
      let update = new Update(mainWindow)
      update.autoUpdate()
    }else if(arg == 'autoCheckUpdate') {
      let update = new Update(mainWindow)
      update.autoCheckUpdate()
    }else if(arg == 'handCheckUpdate') {
      let update = new Update(mainWindow)
      update.handCheckUpdate()
    }
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

  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    //设置文件存放位置
    let filename = item.getFilename();
    let name = filename.substring(0,filename.lastIndexOf("."));
    let ext = filename.substring(filename.lastIndexOf("."));
    //item.setSavePath(folderpath+`\\${filename}`);
    fs.stat(folderpath+`\\${filename}`, function(err, stat){
        if(stat&&stat.isFile()) {
            console.log('文件存在！');
            
            /*let time = new Date().getTime();
            item.setSavePath(folderpath+`\\${time}${filename}`); */
            /* for(let i=1; i<3 ; i++){
              let new_path = name+'('+i+')'+ext
              fs.stat(new_path, (err, stats)=>{
                if(!stats) {
                  item.setSavePath(new_path);
                  // break;
                  console.log(i);
                }
              })
            } */
        } else {
            item.setSavePath(folderpath+`\\${filename}`);
        }
    })
    downloadItems.set(md5(item.getURL()),item);
    console.log(item.getURL())

    item.on('updated', (event, state) => {
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

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
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
  autoUpdater.checkForUpdates();
})

function sendUpdateMessage(text) {
mainWindow.webContents.send('message', text);
} */