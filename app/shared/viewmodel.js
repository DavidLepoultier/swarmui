function ImageViewModel(data) {
    this.Id = data.Id;
    this.Tag = data.Tag;
    this.Repository = data.Repository;
    this.Created = data.Created;
    this.Checked = false;
    this.RepoTags = data.RepoTags;
    this.VirtualSize = data.VirtualSize;
}

function RolesViewModel(data) {
    this.Roles = data;
}

function ContainerViewModel(data) {
    this.Id = data.Id;
    this.Image = data.Image;
    this.Command = data.Command;
    this.Created = data.Created;
    this.SizeRw = data.SizeRw;
    this.Status = data.Status;
    this.Checked = false;
    this.Names = data.Names;
}

function SwarmViewModel(data) {
    this.nodename = data.nodename;
    this.version = data.version;
    this.health = data.health;
    this.url = data.url;
    this.Checked = false;
}
function SwarmHostViewModel(data) {
    this.nodename = data.nodename;
    this.version = data.version;
    this.health = data.health;
    this.url = data.url;
    this.contRunning = data.containersRunning;
    this.contStopped = data.containersStopped;
    this.contGhost = data.containersGhost;
}

function ContainersUpdateModel(data) {
    this.id = data.Id;
    this.image = data.Image;
    this.status = data.Status;
}

function ConsulTasksModel(data) {
    this.nodeName = data.nodeName;
    this.containerID = data.containerID;
    this.action = data.action;
    this.stat = data.stat;
    this.describe = data.describe;
    this.progress = data.progress;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.logs = data.logs;
}
