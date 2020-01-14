const { dialog } = require('electron').remote
const { ipcRenderer } = require('electron')
class Download {
    constructor() {}
    /**
     * 选择保存路径
     */
    static choosePath() {
        dialog.showOpenDialog({
            //默认路径
            //defaultPath :'D:/Documents/Downloads',
            //选择操作，此处是打开文件夹
            properties: [
                'openDirectory',
            ],
            //过滤条件
            filters: [
                { name: 'All', extensions: ['*'] },
            ]
        },function(res) {
            return res
        })
    }

    /**
     * 下载文件
     */
    static startDownload() {
        if(downloadFolder.value != "" && downloadAddress.value != "") {
            //下载文件
            //渲染器进程代码
            ipcRenderer.on('tips', (event, tips) => {
                percent.innerHTML = tips;
            });
            ipcRenderer.send('download',downloadAddress.value+"+"+downloadFolder.value+"+startDownload");
        } else if(downloadAddress.value=="") {
            alert("未填写下载地址");
        } else {
            alert("未选择文件夹")
        }
    }

    /**
     * 暂停下载
     */
    static stopDownload() {
        ipcRenderer.send('download',downloadAddress.value+"+"+downloadFolder.value+"+stopDownload");
    }

    /**
     * 继续下载
     */
    static resumeDownload() {
        ipcRenderer.send('download',downloadAddress.value+"+"+downloadFolder.value+"+resumeDownload");
    }

    /**
     * 取消下载
     */
    static cancelDownload() {
        ipcRenderer.send('download',downloadAddress.value+"+"+downloadFolder.value+"+cancelDownload");
    }

}
export default Download