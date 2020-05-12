<template>
    <div id="dowmload" @mouseleave="dataOut()" :class="dowmloadShow?'show':'unShow'" @click="dowmloadBox" :style="{top:client.top+'px',left:client.left+'px'}">
        <div class="dowmload_top">
            <div class="header_left">
                下载管理
            </div>
            <div class="header_right">
                <img src="../assets/images/clear.png" id="headerImg" title="清除任务" class="pointer" @click="removeAll" alt="">
            </div>
        </div>
        <div class="removeall" :class="clear?'show':'unShow'">
            <div class="flist" @click="clearNoExists">清除文件不存在的任务</div>
            <div class="flist" @click="clearAll">清除所有任务</div>
        </div>

        <div class="dowmload_content" id="dowmload_content">
            <div class="dowmload_content_item" v-for="(item,index) in dowmload_data" :key='index' @mouseover="dataOver(index)" :style="{backgroundColor:(item.overMouse?'#F3F8FD':'')}">
                <div class="content_left">
                    <div v-if="item.progressShow">
                        <Circle :percent="item.percent" :stroke-color="color" :stroke-width="8" :trail-width="8" :size="60">
                            <img :src="item.icon" alt="">
                        </Circle>
                    </div>
                    <div v-else>
                        <img :src="item.icon" alt="">
                    </div>
                </div>
                <div class="content_right">
                    <div class="content_right_title">{{item.filename}}</div>
                    <div class="content_right_link">{{item.url}}</div>
                    <div class="content_right_info" v-if="!item.overMouse">
                        <div class="content_right_info_size" v-if="item.state == 'progressing'"><Icon type="ios-download" color="#5EB1F0"/>{{item.receivedBytes}}/{{item.totalBytes}}</div>
                        <div class="content_right_info_size" v-else-if="!item.fileExists"><Icon type="md-alert" size="18" color="#FECB7F" />文件不存在</div>
                        <div class="content_right_info_size" v-else>{{item.totalBytes}}</div>
                        <div class="content_right_info_time">{{item.startTime}}</div>
                    </div>
                    <div class="content_right_info_hover" v-else-if="item.overMouse">
                        <div class='border' v-if="item.fileExists">
                            <img src="../assets/images/file.png" title="打开所在文件夹" @click="openFileHandler(item.savePath, item.startTime)" alt="">
                        </div>
                        <div v-if="item.state == 'progressing'" class='border'>
                            <div v-if="item.paused == false" class='icon'>
                                <Icon type="md-pause" color="#131414" size="20" title="暂停" @click="stop(item.startTime)" style="line-height:20px"/>
                            </div>
                            <div v-else class='icon'>
                                <Icon type="md-play" color="#131414" size="20" title="开始" @click="start(item.startTime)" style="line-height:20px"/>
                            </div>
                        </div>
                        <!-- <div class='border'>
                            <img src="../assets/images/refresh.png" title="重新开始" alt="">
                        </div> -->
                        <div class='border' v-if="item.state == 'progressing' || !item.fileExists">
                            <img src="../assets/images/delete.png" @click="cancle(item.startTime, item.state)" title="移除" alt="">
                        </div>
                        <div class='border deleteDom' @click="deleteBoxShow($event, index, item.startTime, item.state, item.savePath)" v-else>
                            <img src="../assets/images/delete.png" title="移除" alt="">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="delete_bg" v-if="deleteShow" @click="hideDelete"></div>
        <div id="delete_box" :class="deleteShow?'show':'unShow'" :style="{top:deletePosition.top+'px',left:deletePosition.left+'px'}">
            <div class="delete_action_one" @click="chooseRemember">
                <div class="delete_unchecked" v-if="!rememberChoose"></div>
                <div class="delete_checked" v-else-if="rememberChoose">√</div>
                <span>记住我的选择，不再询问</span>
            </div>
            <div class="delete_action_two" @click="remove">从列表中移除</div>
            <div class="delete_action_two" @click="removeAndDelete">并删除文件</div>
        </div>
    </div>
</template>

<script>
  const { ipcRenderer } = require('electron')
  const { shell, app } = require('electron').remote
  const fs = require('fs')
  const nedb = require('nedb')
  // 初始化 nedb 数据库
  const db = new nedb({
    filename: app.getPath('userData') + '/download.db',
    autoload: true
  });
    export default {
        props:{
            dowmloadShow:{
                type: Boolean,
                default: false   
            },
            client:{
                type: Object
            },
            dowmload_data:{
                type: Array,
                default: ()=>{
                    return []
                }
            }
        },
        data() {
            return {
                color: '#2db7f5',
                clear: false,

                deletePosition: {
                    top: 0,
                    left: 0
                },

                deleteShow: false,
                rememberChoose: false,

                startTime: '',
                state: '',
                savePath: '',
                page: 1
            }
        },
        mounted() {
            document.addEventListener('click',()=>{
                if(this.deleteShow){
                    this.deleteShow = false;
                }
            })
            document.getElementById('dowmload_content').addEventListener('scroll',(e)=>{
                    if(e.target.scrollHeight <= e.target.scrollTop + e.target.clientHeight){
                        var page = ++ this.page
                        db.count({}, (err, count) => {
                            var counts = count;
                            var pageSize = 12;
                            var pageCount = Math.ceil(counts / pageSize)
                            var currentPage = page
                            var start = (currentPage - 1) * pageSize
                            if (page <= pageCount){
                                this.insertData(start, pageSize)
                            }else{
                                console.log('别滑了')
                            }
                        })
                    }
                })
        },
        methods: {
            insertData(start, pageSize) {
                // 读取历史数据
                db.find({}).sort({
                    startTime: -1,
                }).skip(start).limit(pageSize).exec((err, ret) => {
                if (ret) {
                    for(let key in ret) {
                        let filename = ret[key].savePath.split('\\').pop()
                        ret[key].filename = filename
                        ret[key].startTime = this.timestampToTime(ret[key].startTime)
                        ret[key].overMouse = false
                        ret[key].percent = Number(((ret[key].receivedBytes / ret[key].receivedBytes) * 100).toFixed(2))
                        ret[key].totalBytes = this.computeSize(ret[key].receivedBytes)
                        ret[key].receivedBytes = this.computeSize(ret[key].receivedBytes)
                        ret[key].fileExists = fs.existsSync(ret[key].savePath)
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
                        this.dowmload_data.push(ret[key]);
                    }
                }
                })
            },
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
            dowmloadBox:function(e){
                e.stopPropagation();
                var el = e.target
                var id = el.getAttribute('id')
                if(id !== 'headerImg') {
                    this.clear = false
                }
            },
            dataOver:function(index){
                for(let key in this.dowmload_data){
                    this.dowmload_data[key].overMouse = false;
                }
                this.dowmload_data[index].overMouse = true;
            },
            dataOut:function(index){
                for(let key in this.dowmload_data){
                    this.dowmload_data[key].overMouse = false;
                }
            },
            stop(startTime) {
                var date = new Date(startTime)
                var time = date.getTime()/1000
                time = time.toString()
                ipcRenderer.send('stopDownload', time)
            },
            start(startTime) {
                var date = new Date(startTime)
                var time = date.getTime()/1000
                time = time.toString()
                ipcRenderer.send('startDownload', time)
            },
            cancle(startTime, state) {
                this.deleteShow = false;
                var date = new Date(startTime)
                var time = date.getTime()/1000
                time = time.toString()
                ipcRenderer.send('cancleDownload', {time: time, state: state})
            },
            remove() {
                this.deleteShow = false;
                var date = new Date(this.startTime)
                var time = date.getTime()/1000
                time = time.toString()
                ipcRenderer.send('cancleDownload', {time: time, state: this.state})
            },
            removeAndDelete() {
                this.deleteShow = false;
                var date = new Date(this.startTime)
                var time = date.getTime()/1000
                time = time.toString()
                if(fs.existsSync(this.savePath)) {
                    fs.unlinkSync(this.savePath)
                }
                ipcRenderer.send('cancleDownload', {time: time, state: this.state})
            },
            openFileHandler(filePath, startTime) {
                if(fs.existsSync(filePath)) {
                    shell.showItemInFolder(filePath);
                }else{
                    var date = new Date(startTime)
                    var time = date.getTime()/1000
                    time = time.toString()
                    ipcRenderer.send('exists', time)
                }  
            },
            removeAll() {
                if(this.clear == false) {
                    this.clear = true
                }else{
                    this.clear = false
                }
            },
            clearNoExists() {
                ipcRenderer.send('clearNoExists')
            },
            clearAll() {
                ipcRenderer.send('clearAll')
            },
            deleteBoxShow:function(e, index, startTime, state, savePath){
                this.startTime = startTime
                this.savePath = savePath
                this.state = state
                this.deleteShow = !this.deleteShow;

                let deleteDom = document.getElementsByClassName('deleteDom')[0];
                let contentDom = document.getElementById('dowmload_content');
                console.log(deleteDom.offsetTop + 30 - contentDom.scrollTop)
                if(contentDom.offsetHeight + 50 < deleteDom.offsetTop + 30 - contentDom.scrollTop + 200 ){
                    this.deletePosition.top = deleteDom.offsetTop - contentDom.scrollTop - 200;
                    this.deletePosition.left = deleteDom.offsetLeft;
                } else {
                    this.deletePosition.top = deleteDom.offsetTop + 30 - contentDom.scrollTop;
                    this.deletePosition.left = deleteDom.offsetLeft;
                }
            },

            chooseRemember:function(){
                this.rememberChoose = !this.rememberChoose;
            },

            hideDelete:function(){
                if(this.deleteShow){
                    this.deleteShow = false;
                }
            },
        },
    }
</script>

<style scoped>
    #dowmload{
        width: 450px;
        height: 550px;
        background: #FDFDFD;
        position: fixed;
        box-shadow:0px 0px 3px 2px rgba(240,241,245,1);
    }
    /* 头部 */
    .dowmload_top{
        height: 50px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
        background: #FFFFFF;
        box-shadow:0px 3px 5px 0px rgba(240,241,245,1);
    }
    .header_left{
        font-size: 24px;
        color: #000000;
    }
    .header_right{

    }
    .header_right img{
        width: 22px;
        height: 22px;
    }

    /* 内容 */
    .dowmload_content{
        height: calc(100% - 50px);
        overflow-y: auto;
    }
    .dowmload_content .dowmload_content_item{
        padding: 15px 10px 20px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #E6E6E6;
        cursor: pointer;
    }
    .dowmload_content .dowmload_content_item:last-of-type{
        border-bottom: none;
    }
    .dowmload_content .dowmload_content_item .content_left{
        padding-right: 20px;
    }
    .dowmload_content .dowmload_content_item .content_left>div{
        width: 60px;
        height: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .dowmload_content .dowmload_content_item .content_left>div img{
        width: 30px;
        height: 30px;
    }
    .dowmload_content .dowmload_content_item .content_right{
        width: calc(100% - 100px);
        display: flex;
        flex-direction: column;
        color: #B0B4C3;
        font-size: 16px;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_title{
        overflow: hidden;
        text-overflow:ellipsis;
        white-space: nowrap;
        color: #3E3E3E;
        width: 100%;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_link{
        margin: 10px 0;
        overflow: hidden;
        text-overflow:ellipsis;
        white-space: nowrap;
        width: 100%;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_info{
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 20px;
        font-size: 14px;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_info_hover{
        height: 20px;
        display: flex;
        align-items: center;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_info_hover img{
        width: 20px;
        height: 20px;
        margin: 5px;
    }
    .border{
        width: 30px;
        height: 30px;
        margin-right: 5px;
    }
    .dowmload_content .dowmload_content_item .content_right .content_right_info_hover .border:hover{
        background-color: #c7d2d4;
        border-radius: 50%;
    }
    .pointer{
        cursor: pointer;
    }
    .icon{
        margin: 2.5px 5px;
    }
    .removeall{
        position: absolute;
        top: 50px;
        right: 20px;
        z-index:999;
        background:#FFF;
        width: 200px;
        box-shadow:1px 3px 5px 0px rgba(163,163,163,1);
    }
    .flist{
        padding: 0 15px;
        height: 55px;
        line-height: 55px;
        cursor: pointer;
    }
    .flist:hover{
        background: #EEEEEE;
    }


    .unShow{
		display: none;
	}
	.show{
		animation: go_in .6s;
		display: block;
	}
	@keyframes go_in {
	    0% {
            opacity: 0; 
        }
	    100%{
            opacity: 1; 
        }
    }

    #delete_bg{
        width: 450px;
        height: 550px;
        background: transparent;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 9;
    }

    #delete_box{
        width: 200px;
        height: 200px;
        background: #ffffff;
        position: absolute;
        box-shadow:0px 2px 5px 0px rgba(163,163,163,1);
        font-size: 14px;
        padding: 10px 0;
        color: #6D6D6D;
        z-index: 10;
    }
    #delete_box .delete_action_one{
        padding: 0 15px;
        height: 70px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #CCCCCC;
        cursor: pointer;
    }
    #delete_box .delete_action_one div{
        width: 15px;
        height: 15px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    #delete_box .delete_action_one span{
        display: inline-block;
        width: 85%;
    }
    #delete_box .delete_action_one .delete_unchecked{
        border: 2px solid #6D6D6D;
        color: #000000;
        background: #FFFFFF;
    }
    #delete_box .delete_action_one .delete_checked{
        border: 2px solid #3F51B5;
        color: #FFFFFF;
        background: #3F51B5;
    }
    #delete_box .delete_action_two{
        padding: 0 15px;
        height: 55px;
        line-height: 55px;
        cursor: pointer;
    }
    #delete_box .delete_action_one:hover,#delete_box .delete_action_two:hover{
        background: #EEEEEE;
    }
</style>