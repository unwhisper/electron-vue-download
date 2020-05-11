<template>
<div class="content">
  <Row>
    <Col span="12">
      <div class="input">
        <label for="downloadUrl">下载地址:</label>
        <input placeholder="下载地址" name="downloadUrl" class="input_class" id="downloadUrl" style="width: 300px" />
        <Button type="success" size="small" id="download" ghost icon="md-download" @click="startDownload"></Button>
      </div>
      <div class="input">
        <label>保存地址:</label>
        <input type="text" name="savePath" id="savePath" class="input_class" style="width: 300px" readonly />
        <Button type="primary" id="changePath" @click="choosePath">选择文件夹</Button>
      </div>
      <div class="input">
        <label>更新方式:</label>
        <RadioGroup v-model="update_type" @on-change="updateType" vertical>
            <Radio label="auto">
                <Icon type="social-auto"></Icon>
                <span>自动更新</span>
            </Radio>
            <Radio label="tips">
                <Icon type="social-tips"></Icon>
                <span>新版本提示更新</span>
            </Radio>
        </RadioGroup>
      </div>
      <div class="input" style="display:flex;align-items: center;">
        <div>
          版本：{{version}}
        </div>
        <div>
        <!-- <Button type="primary" @click="modela">普通组件使用方法</Button> -->
        <Button type="primary" @click="handCheckUpdate">检测更新</Button>
        
      </div>
      </div>
    </Col>
    <Col span="12">
      <div>
        <div class="downdiv" @click="openDownload">
          <img src="../../../static/image/48.png" class="downicon" alt="">
        </div>
        <Dowmload :dowmloadShow="dowmloadShow" :client="client" :dowmload_data="dowmload_data"></Dowmload>
      </div>
    </Col>
  </Row>
</div>
</template>

<script>
  import Download from '../../../static/download.js'
  import Dowmload from '@/components/dowmload.vue';
  const { dialog ,shell,app } = require('electron').remote
  const { ipcRenderer } = require('electron')
  const json_package = require("../../../package.json");
  const Store = require('electron-store');
  const store = new Store();
  const nedb = require('nedb')
  const fs= require('fs')
  // 初始化 nedb 数据库
  const db = new nedb({
    filename: app.getPath('userData') + '/download.db',
    autoload: true
  });
  export default {
    name: 'Index',
    components:{
      Dowmload
    },
    data() {
      return {
        percent: 0,
        percents: 0,
        color: '#2db7f5',
        file_path: '',
        version: json_package.version,      
        update_type: '',
        // 弹窗组件化
        dowmloadShow: false,
        client:{
          top: 0,
          left: 0
        },
        dowmload_data:[]
      }
    },
    mounted() {
    document.addEventListener('click',()=>{
      if(this.dowmloadShow){
        this.dowmloadShow = false;
      }
    })
    // 渲染进程中
    this.init()
    ipcRenderer.on('new-download-item', (e, item) => {
        // 数据库新增一条新纪录
        db.insert(item);
        
        // UI中新增一条下载任务
        this.addItem(item)
    })
    
    // 更新下载窗口的任务进度
    ipcRenderer.on('download-item-updated', (e, item) => {
      db.update({startTime: item.startTime}, {$set: item});
      let percent = Number(((item.receivedBytes / item.totalBytes) * 100).toFixed(2));
      this.dowmload_data.map((data) => {
        if(this.timestampToTime(item.startTime) == data.startTime) {
          data.percent = percent
          data.state = item.state
          data.totalBytes = this.computeSize(item.totalBytes)
          data.receivedBytes = this.computeSize(item.receivedBytes)
          data.paused = item.paused
        }
      })
    })
    
    
    // 下载结束，更新数据
    ipcRenderer.on('download-item-done', (e, item) => {
      if(item.state == 'cancelled'){
        for(let key in this.dowmload_data) {
          var date = new Date(this.dowmload_data[key].startTime)
          var time = date.getTime()/1000
          time = time.toString()
          if(time == item.startTime) {
            this.dowmload_data.splice(key, 1);
            break
          }
        }
        console.log(this.dowmload_data)
        db.remove({startTime: item.startTime})
      }else{
        // 更新数据库
        db.update({startTime: item.startTime}, {$set: item});
        this.dowmload_data.map((data) => {
          if(this.timestampToTime(item.startTime) == data.startTime) {
            data.percent = 100
            data.state = item.state
            data.progressShow = false
            app.getFileIcon(item.savePath).then((nativeImage) => {
              data.icon =  nativeImage.toDataURL()
            }).catch(err => {
              console.log(err)
            })
          }
        })
      }
    });

    ipcRenderer.on('removeRecord', (e, arg) => {
      for(let key in this.dowmload_data) {
        var date = new Date(this.dowmload_data[key].startTime)
        var time = date.getTime()/1000
        time = time.toString()
        if(time == arg) {
          this.dowmload_data.splice(key, 1);
          break
        }
      }
      db.remove({startTime: arg})
    })
    //pg.set('key', {hello: 'lndb!'})

    // 读取类型信息
    //pg.get('key')

    // 删除指定key的缓存
    //pg.remove('key')

    // 清空类型下所有缓存
    //pg.clear()
    let updateType = store.get('updateType')
    if(updateType && store.has('updateType')) {
      this.update_type = updateType
    }

    if(navigator.onLine){
      ipcRenderer.send("checkForUpdate");
    }

    if(this.update_type == 'auto') {
      ipcRenderer.send('update',"update");
      //ipcRenderer.send('isDownload');
    }else if(this.update_type == 'tips') {
      ipcRenderer.send('update',"autoCheckUpdate");
    }
    // 收到消息
    ipcRenderer.on("message", (event, text) => {
      this.$Modal.info({
        title: '检测更新',
        content: text ,
        width: 270 
      });
    });

    // 下载进度
    ipcRenderer.on("downloadProgress", (event, progressObj)=> {
      let progress = progressObj.percent | 0;
      this.$Modal.info({
        title: '检测更新',
        content: '下载进度：' + progress + '%',
        width: 270 
      });
    }); 

    // 安装
    ipcRenderer.on("isUpdateNow", () => {
        // 是否更新
        this.$Modal.confirm({
          title: '检测更新',
          content: '下载完成，是否立即安装？(安装需要重启应用)',
          okText: '更新',
          cancelText: '取消',
          onOk: () => {
            ipcRenderer.send("isUpdateNow");
            this.$Message.info('Clicked ok');
          },
          onCancel: () => {
            this.$Message.info('Clicked cancel');
          }
      });
    });

    // 检测到新版本
    ipcRenderer.on("updateAvailable", (event, message) => {
      this.$Modal.confirm({
        title: '检测更新',
        content: message,
        okText: '更新',
        cancelText: '取消',
        onOk: () => {
          ipcRenderer.send('isDownload');
          this.$Message.info('Clicked ok');
        },
        onCancel: () => {
          this.$Message.info('Clicked cancel');
        }
      });
    });

    ipcRenderer.on("autoUpdateAvailable", (event, message) => {
      this.$Modal.info({
        title: '检测更新',
        content: message,
        width: 270 
      });
      ipcRenderer.send('isDownload');
    });

    /**
     * 热更新
     */
    ipcRenderer.on("hotUpdate", () => {
        // 是否更新
        this.$Modal.confirm({
          title: '检测更新',
          content: '请点击按钮进行更新，更新后重启生效',
          okText: '立即更新',
          cancelText: '下次更新',
          onOk: () => {
            ipcRenderer.send("hotUpdateNow");
            this.$Message.info('Clicked ok');
          },
          onCancel: () => {
            this.$Message.info('Clicked cancel');
          }
      });
    });

    ipcRenderer.on("upgradeSuccess", () => {
        // 是否更新
        this.$Modal.confirm({
          title: '更新成功',
          content: '重新启动体验新版本',
          okText: '立即重启',
          cancelText: '暂不重启',
          onOk: () => {
            app.relaunch()
            app.exit(0)
          },
          onCancel: () => {
          }
      });
    });

    /* // 网络可达情况下检测是否有新版本
        if(navigator.onLine){
            ipcRenderer.send("checkForUpdate");
        }
        // 收到消息
        ipcRenderer.on("message", (event, text) => {
          this.$Modal.info({
            title: '检测更新',
            content: text ,
            width: 270 
          });
        });

        // 下载进度
        ipcRenderer.on("downloadProgress", (event, progressObj)=> {
          let progress = progressObj.percent | 0;
          this.$Modal.info({
            title: '检测更新',
            content: '下载进度：' + progress + '%',
            width: 270 
          });
        }); 

        // 安装
        ipcRenderer.on("isUpdateNow", () => {
            // 是否更新
            this.$Modal.confirm({
              title: '检测更新',
              content: '下载完成，是否立即安装？(安装需要重启应用)',
              okText: '更新',
              cancelText: '取消',
              onOk: () => {
                ipcRenderer.send("isUpdateNow");
                this.$Message.info('Clicked ok');
              },
              onCancel: () => {
                this.$Message.info('Clicked cancel');
              }
          });
        });

        // 检测到新版本
        ipcRenderer.on("updateAvailable", (event, message) => {
          this.$Modal.confirm({
            title: '检测更新',
            content: message,
            okText: '更新',
            cancelText: '取消',
            onOk: () => {
              ipcRenderer.send('isDownload');
              this.$Message.info('Clicked ok');
            },
            onCancel: () => {
              this.$Message.info('Clicked cancel');
            }
          });
        }); */

    let downloadPath = store.get('downloadPath')
    if(downloadPath && store.has('downloadPath')) {
      let downloadFolder = document.querySelector("#savePath")
      downloadFolder.value = downloadPath
    }

    },
    methods: {
      timestampToTime(timestamp) {
        var date = new Date(timestamp * 1000);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
        var Y = date.getFullYear() + '-';
        var M = (date.getMonth() + 1) + '-';
        var D = date.getDate() + ' ';
        var h = date.getHours() + ':';
        var m = date.getMinutes() + ':';
        var s = date.getSeconds();
        return Y + M + D + h + m + s;
      },
      computeSize(fileByte) {
        var fileSizeByte = fileByte;
        var fileSizeMsg = "";
        if (fileSizeByte < 1048576) fileSizeMsg = (fileSizeByte / 1024).toFixed(2) + "KB";
        else if (fileSizeByte == 1048576) fileSizeMsg = "1MB";
        else if (fileSizeByte > 1048576 && fileSizeByte < 1073741824) fileSizeMsg = (fileSizeByte / (1024 * 1024)).toFixed(2) + "MB";
        else if (fileSizeByte > 1048576 && fileSizeByte == 1073741824) fileSizeMsg = "1GB";
        else if (fileSizeByte > 1073741824 && fileSizeByte < 1099511627776) fileSizeMsg = (fileSizeByte / (1024 * 1024 * 1024)).toFixed(2) + "GB";
        else fileSizeMsg = "文件超过1TB";
        return fileSizeMsg;
      },
      addItem(item) {
        let data = {}
        let filename = item.savePath.split('\\').pop()
        let defaultIcon = require('../assets/images/default.png');
        data = {'filename': filename, 'savePath': item.savePath, 'url': item.url, 'state': item.state, 'paused': item.paused, 'startTime': this.timestampToTime(item.startTime), 'overMouse': false, 'percent': 0, 'totalBytes': this.computeSize(item.totalBytes), 'receivedBytes': this.computeSize(item.receivedBytes), 'icon': defaultIcon, progressShow: item.progressShow}
        this.dowmload_data.unshift(data)
      },
      updateType() {
        //this.$Message.success(this.vertical)
        let upType = this.update_type
        store.set('updateType', upType)
      },
      handCheckUpdate() {
        if(navigator.onLine){
          ipcRenderer.send("checkForUpdate");
        }
        ipcRenderer.send('update',"handCheckUpdate");
      },
      openFileHandler() {
        /* let downloadPath = download.get('downloadPath')
        let path = downloadPath.txt */
        shell.showItemInFolder(this.file_path);
      },
      openFile() {
        shell.openItem(this.file_path)
      },
      /**
       * 选择文件夹
       */
      choosePath() {
        let downloadFolder = document.querySelector("#savePath")
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
        }).then(result => {
          if (result.canceled === false) {
            downloadFolder.value = result.filePaths[0]
            store.set('downloadPath',result.filePaths[0])
          }
        }).catch(err => {
          console.log(err)
        })
      },
      /**
       * 开始下载
       */
      startDownload() {
        let downloadAddress = document.querySelector('#downloadUrl')
        let downloadFolder = document.querySelector("#savePath")
        if(downloadFolder.value != "" && downloadAddress.value != "") {
            //下载文件
            //渲染器进程代码
            ipcRenderer.on('tips', (event, tips) => {
                if(tips === '下载完成'){
                  this.percents = tips;
                  this.percent = 100
                  this.color = '#5cb85c';
                }else{
                  this.percents = tips;
                  this.percent = tips | 0
                }
            })

            ipcRenderer.on('file',(event, tips) => {
              this.file_path = tips;
            })
            
            ipcRenderer.send('download',JSON.stringify({
              downloadUrl: downloadAddress.value,
              savePath: downloadFolder.value,
              command: 'startDownload'
            }));
        } else if(downloadAddress.value=="") {
            alert("未填写下载地址");
        } else {
            alert("未选择文件夹")
        }
      },

      openDownload(e) {
        this.dowmloadShow = !this.dowmloadShow;
        e.stopPropagation();
        this.client.top = e.clientX;
        this.client.left = e.clientY;
      },
      init() {
        // 读取历史数据
        db.find({}).sort({
          startTime: -1,
        }).limit(50).exec((err, ret) => {
          if (ret) {
          /* this.setList(downloadHistory.map((d) => {
            const item = d;
            // 历史记录中，只有需要未完成和完成两个状态
            if (item.state !== 'completed') { 
              item.state = 'cancelled';
            }
            return item;
          })); */
          for(let key in ret) {
            let filename = ret[key].savePath.split('\\').pop()
            ret[key].filename = filename
            ret[key].startTime = this.timestampToTime(ret[key].startTime)
            ret[key].overMouse = false
            ret[key].percent = Number(((ret[key].receivedBytes / ret[key].receivedBytes) * 100).toFixed(2))
            ret[key].totalBytes = this.computeSize(ret[key].receivedBytes)
            ret[key].receivedBytes = this.computeSize(ret[key].receivedBytes)
            const defaultIcon = require('../assets/images/default.png');
            if (!ret[key].savePath) {
              ret[key].icon =  defaultIcon
            }else{
              app.getFileIcon(ret[key].savePath).then((nativeImage) => {
                // console.log(nativeImage.toDataURL())
                ret[key].icon =  nativeImage.toDataURL()
              }).catch(err => {
                ret[key].icon =  defaultIcon
                console.log(err)
              })
            }   
          }
          this.dowmload_data = ret
          console.log(ret)
        }
        })
      }
    }
  }
</script>

<style>
.content{
  margin-top: 10px;
  margin-left: 10px;
}
.input{
  margin: 10px 0;
}
.ivu-modal-header {
  background-color: #cde;
}
.ivu-modal-body{
  background-color: #cde;
}
.ivu-modal-footer{
  background-color: #cde;
}
.input_class{
  display: inline-block;
  width: 100%;
  height: 32px;
  line-height: 1.5;
  padding: 4px 7px;
  font-size: 12px;
  border: 1px solid #dcdee2;
  border-radius: 4px;
  color: #515a6e;
  background-color: #fff;
  background-image: none;
  position: relative;
  cursor: text;
}
.downdiv{
  width:36px;
  height:36px;
  cursor: pointer;
}
.downdiv:hover {
  background-color: rgba(203, 231, 233, 0.5);
  border-radius: 50%;
}
.downicon{
  width: 26px;
  height: 26px;
  margin: 5px;
}
</style>
