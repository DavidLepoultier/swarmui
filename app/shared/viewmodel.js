function ImageViewModel(data) {
    this.Id = data.Id;
    this.Tag = data.Tag;
    this.Repository = data.Repository;
    this.Created = data.Created;
    this.Checked = false;
    this.RepoTags = data.RepoTags;
    this.VirtualSize = data.VirtualSize;
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

function ContainersUpdateModel(data) {
    this.id = data.Id;
    this.image = data.Image;
    this.status = data.Status;
}

function ConsulNodesModel(data) {
    this.name = data.name;
    this.version = data.version;
    this.url = data.url;
    this.status = data.status;
    this.warning = data.warning;
    this.checked = false;
}

function ConsulContainersModel(data) {
    this.idConsul = data.idConsul;
    this.nodeName = data.nodeName;
    this.id = data.id;
    this.image = data.image;
    this.serviceName = data.serviceName;
    this.status = data.status;
    this.warning = data.warning;
    this.checked = false;
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
