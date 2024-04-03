// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.33.0
// 	protoc        (unknown)
// source: registry/ibc.proto

package registry

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	_ "google.golang.org/protobuf/types/descriptorpb"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type IBCChain struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	ChainName    string `protobuf:"bytes,1,opt,name=chain_name,proto3" json:"chain_name,omitempty"`
	ClientId     string `protobuf:"bytes,2,opt,name=client_id,proto3" json:"client_id,omitempty"`
	ConnectionId string `protobuf:"bytes,3,opt,name=connection_id,proto3" json:"connection_id,omitempty"`
}

func (x *IBCChain) Reset() {
	*x = IBCChain{}
	if protoimpl.UnsafeEnabled {
		mi := &file_registry_ibc_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *IBCChain) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*IBCChain) ProtoMessage() {}

func (x *IBCChain) ProtoReflect() protoreflect.Message {
	mi := &file_registry_ibc_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use IBCChain.ProtoReflect.Descriptor instead.
func (*IBCChain) Descriptor() ([]byte, []int) {
	return file_registry_ibc_proto_rawDescGZIP(), []int{0}
}

func (x *IBCChain) GetChainName() string {
	if x != nil {
		return x.ChainName
	}
	return ""
}

func (x *IBCChain) GetClientId() string {
	if x != nil {
		return x.ClientId
	}
	return ""
}

func (x *IBCChain) GetConnectionId() string {
	if x != nil {
		return x.ConnectionId
	}
	return ""
}

type ChannelData struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Chain_1  *ChannelData_ChannelPort `protobuf:"bytes,1,opt,name=chain_1,proto3" json:"chain_1,omitempty"`
	Chain_2  *ChannelData_ChannelPort `protobuf:"bytes,2,opt,name=chain_2,proto3" json:"chain_2,omitempty"`
	Ordering string                   `protobuf:"bytes,3,opt,name=ordering,proto3" json:"ordering,omitempty"`
	Version  string                   `protobuf:"bytes,4,opt,name=version,proto3" json:"version,omitempty"`
	Tags     *ChannelData_Tags        `protobuf:"bytes,5,opt,name=tags,proto3" json:"tags,omitempty"`
}

func (x *ChannelData) Reset() {
	*x = ChannelData{}
	if protoimpl.UnsafeEnabled {
		mi := &file_registry_ibc_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ChannelData) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ChannelData) ProtoMessage() {}

func (x *ChannelData) ProtoReflect() protoreflect.Message {
	mi := &file_registry_ibc_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ChannelData.ProtoReflect.Descriptor instead.
func (*ChannelData) Descriptor() ([]byte, []int) {
	return file_registry_ibc_proto_rawDescGZIP(), []int{1}
}

func (x *ChannelData) GetChain_1() *ChannelData_ChannelPort {
	if x != nil {
		return x.Chain_1
	}
	return nil
}

func (x *ChannelData) GetChain_2() *ChannelData_ChannelPort {
	if x != nil {
		return x.Chain_2
	}
	return nil
}

func (x *ChannelData) GetOrdering() string {
	if x != nil {
		return x.Ordering
	}
	return ""
}

func (x *ChannelData) GetVersion() string {
	if x != nil {
		return x.Version
	}
	return ""
}

func (x *ChannelData) GetTags() *ChannelData_Tags {
	if x != nil {
		return x.Tags
	}
	return nil
}

type IBCData struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Schema   string         `protobuf:"bytes,1,opt,name=schema,json=$schema,proto3" json:"schema,omitempty"`
	Chain_1  *IBCChain      `protobuf:"bytes,2,opt,name=chain_1,proto3" json:"chain_1,omitempty"`
	Chain_2  *IBCChain      `protobuf:"bytes,3,opt,name=chain_2,proto3" json:"chain_2,omitempty"`
	Channels []*ChannelData `protobuf:"bytes,4,rep,name=channels,proto3" json:"channels,omitempty"`
}

func (x *IBCData) Reset() {
	*x = IBCData{}
	if protoimpl.UnsafeEnabled {
		mi := &file_registry_ibc_proto_msgTypes[2]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *IBCData) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*IBCData) ProtoMessage() {}

func (x *IBCData) ProtoReflect() protoreflect.Message {
	mi := &file_registry_ibc_proto_msgTypes[2]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use IBCData.ProtoReflect.Descriptor instead.
func (*IBCData) Descriptor() ([]byte, []int) {
	return file_registry_ibc_proto_rawDescGZIP(), []int{2}
}

func (x *IBCData) GetSchema() string {
	if x != nil {
		return x.Schema
	}
	return ""
}

func (x *IBCData) GetChain_1() *IBCChain {
	if x != nil {
		return x.Chain_1
	}
	return nil
}

func (x *IBCData) GetChain_2() *IBCChain {
	if x != nil {
		return x.Chain_2
	}
	return nil
}

func (x *IBCData) GetChannels() []*ChannelData {
	if x != nil {
		return x.Channels
	}
	return nil
}

type ChannelData_ChannelPort struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	ChannelId string `protobuf:"bytes,1,opt,name=channel_id,proto3" json:"channel_id,omitempty"`
	PortId    string `protobuf:"bytes,2,opt,name=port_id,proto3" json:"port_id,omitempty"`
}

func (x *ChannelData_ChannelPort) Reset() {
	*x = ChannelData_ChannelPort{}
	if protoimpl.UnsafeEnabled {
		mi := &file_registry_ibc_proto_msgTypes[3]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ChannelData_ChannelPort) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ChannelData_ChannelPort) ProtoMessage() {}

func (x *ChannelData_ChannelPort) ProtoReflect() protoreflect.Message {
	mi := &file_registry_ibc_proto_msgTypes[3]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ChannelData_ChannelPort.ProtoReflect.Descriptor instead.
func (*ChannelData_ChannelPort) Descriptor() ([]byte, []int) {
	return file_registry_ibc_proto_rawDescGZIP(), []int{1, 0}
}

func (x *ChannelData_ChannelPort) GetChannelId() string {
	if x != nil {
		return x.ChannelId
	}
	return ""
}

func (x *ChannelData_ChannelPort) GetPortId() string {
	if x != nil {
		return x.PortId
	}
	return ""
}

type ChannelData_Tags struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Status    string `protobuf:"bytes,1,opt,name=status,proto3" json:"status,omitempty"`
	Perferred bool   `protobuf:"varint,2,opt,name=perferred,proto3" json:"perferred,omitempty"`
	Dex       string `protobuf:"bytes,3,opt,name=dex,proto3" json:"dex,omitempty"`
}

func (x *ChannelData_Tags) Reset() {
	*x = ChannelData_Tags{}
	if protoimpl.UnsafeEnabled {
		mi := &file_registry_ibc_proto_msgTypes[4]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ChannelData_Tags) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ChannelData_Tags) ProtoMessage() {}

func (x *ChannelData_Tags) ProtoReflect() protoreflect.Message {
	mi := &file_registry_ibc_proto_msgTypes[4]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ChannelData_Tags.ProtoReflect.Descriptor instead.
func (*ChannelData_Tags) Descriptor() ([]byte, []int) {
	return file_registry_ibc_proto_rawDescGZIP(), []int{1, 1}
}

func (x *ChannelData_Tags) GetStatus() string {
	if x != nil {
		return x.Status
	}
	return ""
}

func (x *ChannelData_Tags) GetPerferred() bool {
	if x != nil {
		return x.Perferred
	}
	return false
}

func (x *ChannelData_Tags) GetDex() string {
	if x != nil {
		return x.Dex
	}
	return ""
}

var File_registry_ibc_proto protoreflect.FileDescriptor

var file_registry_ibc_proto_rawDesc = []byte{
	0x0a, 0x12, 0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x2f, 0x69, 0x62, 0x63, 0x2e, 0x70,
	0x72, 0x6f, 0x74, 0x6f, 0x12, 0x08, 0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x1a, 0x20,
	0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x2f, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x75, 0x66, 0x2f,
	0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x6f, 0x72, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f,
	0x22, 0x6e, 0x0a, 0x08, 0x49, 0x42, 0x43, 0x43, 0x68, 0x61, 0x69, 0x6e, 0x12, 0x1e, 0x0a, 0x0a,
	0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x0a, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x6e, 0x61, 0x6d, 0x65, 0x12, 0x1c, 0x0a, 0x09,
	0x63, 0x6c, 0x69, 0x65, 0x6e, 0x74, 0x5f, 0x69, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x09, 0x63, 0x6c, 0x69, 0x65, 0x6e, 0x74, 0x5f, 0x69, 0x64, 0x12, 0x24, 0x0a, 0x0d, 0x63, 0x6f,
	0x6e, 0x6e, 0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x5f, 0x69, 0x64, 0x18, 0x03, 0x20, 0x01, 0x28,
	0x09, 0x52, 0x0d, 0x63, 0x6f, 0x6e, 0x6e, 0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x5f, 0x69, 0x64,
	0x22, 0x86, 0x03, 0x0a, 0x0b, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x44, 0x61, 0x74, 0x61,
	0x12, 0x3b, 0x0a, 0x07, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x31, 0x18, 0x01, 0x20, 0x01, 0x28,
	0x0b, 0x32, 0x21, 0x2e, 0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x2e, 0x43, 0x68, 0x61,
	0x6e, 0x6e, 0x65, 0x6c, 0x44, 0x61, 0x74, 0x61, 0x2e, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c,
	0x50, 0x6f, 0x72, 0x74, 0x52, 0x07, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x31, 0x12, 0x3b, 0x0a,
	0x07, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x32, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x21,
	0x2e, 0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x2e, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65,
	0x6c, 0x44, 0x61, 0x74, 0x61, 0x2e, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x50, 0x6f, 0x72,
	0x74, 0x52, 0x07, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x32, 0x12, 0x1a, 0x0a, 0x08, 0x6f, 0x72,
	0x64, 0x65, 0x72, 0x69, 0x6e, 0x67, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x08, 0x6f, 0x72,
	0x64, 0x65, 0x72, 0x69, 0x6e, 0x67, 0x12, 0x18, 0x0a, 0x07, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f,
	0x6e, 0x18, 0x04, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e,
	0x12, 0x2e, 0x0a, 0x04, 0x74, 0x61, 0x67, 0x73, 0x18, 0x05, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x1a,
	0x2e, 0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x2e, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65,
	0x6c, 0x44, 0x61, 0x74, 0x61, 0x2e, 0x54, 0x61, 0x67, 0x73, 0x52, 0x04, 0x74, 0x61, 0x67, 0x73,
	0x1a, 0x47, 0x0a, 0x0b, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x50, 0x6f, 0x72, 0x74, 0x12,
	0x1e, 0x0a, 0x0a, 0x63, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x5f, 0x69, 0x64, 0x18, 0x01, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x0a, 0x63, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x5f, 0x69, 0x64, 0x12,
	0x18, 0x0a, 0x07, 0x70, 0x6f, 0x72, 0x74, 0x5f, 0x69, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x07, 0x70, 0x6f, 0x72, 0x74, 0x5f, 0x69, 0x64, 0x1a, 0x4e, 0x0a, 0x04, 0x54, 0x61, 0x67,
	0x73, 0x12, 0x16, 0x0a, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x18, 0x01, 0x20, 0x01, 0x28,
	0x09, 0x52, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x12, 0x1c, 0x0a, 0x09, 0x70, 0x65, 0x72,
	0x66, 0x65, 0x72, 0x72, 0x65, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x08, 0x52, 0x09, 0x70, 0x65,
	0x72, 0x66, 0x65, 0x72, 0x72, 0x65, 0x64, 0x12, 0x10, 0x0a, 0x03, 0x64, 0x65, 0x78, 0x18, 0x03,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x03, 0x64, 0x65, 0x78, 0x22, 0xb1, 0x01, 0x0a, 0x07, 0x49, 0x42,
	0x43, 0x44, 0x61, 0x74, 0x61, 0x12, 0x17, 0x0a, 0x06, 0x73, 0x63, 0x68, 0x65, 0x6d, 0x61, 0x18,
	0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x24, 0x73, 0x63, 0x68, 0x65, 0x6d, 0x61, 0x12, 0x2c,
	0x0a, 0x07, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x31, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32,
	0x12, 0x2e, 0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x2e, 0x49, 0x42, 0x43, 0x43, 0x68,
	0x61, 0x69, 0x6e, 0x52, 0x07, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x31, 0x12, 0x2c, 0x0a, 0x07,
	0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x32, 0x18, 0x03, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x12, 0x2e,
	0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x2e, 0x49, 0x42, 0x43, 0x43, 0x68, 0x61, 0x69,
	0x6e, 0x52, 0x07, 0x63, 0x68, 0x61, 0x69, 0x6e, 0x5f, 0x32, 0x12, 0x31, 0x0a, 0x08, 0x63, 0x68,
	0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x73, 0x18, 0x04, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x15, 0x2e, 0x72,
	0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x2e, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x44,
	0x61, 0x74, 0x61, 0x52, 0x08, 0x63, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x73, 0x42, 0x85, 0x01,
	0x0a, 0x0c, 0x63, 0x6f, 0x6d, 0x2e, 0x72, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x42, 0x08,
	0x49, 0x62, 0x63, 0x50, 0x72, 0x6f, 0x74, 0x6f, 0x50, 0x01, 0x5a, 0x2b, 0x67, 0x69, 0x74, 0x68,
	0x75, 0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2f, 0x63, 0x6f, 0x73, 0x6d, 0x6f, 0x6c, 0x6f, 0x67, 0x79,
	0x2d, 0x74, 0x65, 0x63, 0x68, 0x2f, 0x73, 0x74, 0x61, 0x72, 0x73, 0x68, 0x69, 0x70, 0x2f, 0x72,
	0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0xa2, 0x02, 0x03, 0x52, 0x58, 0x58, 0xaa, 0x02, 0x08,
	0x52, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0xca, 0x02, 0x08, 0x52, 0x65, 0x67, 0x69, 0x73,
	0x74, 0x72, 0x79, 0xe2, 0x02, 0x14, 0x52, 0x65, 0x67, 0x69, 0x73, 0x74, 0x72, 0x79, 0x5c, 0x47,
	0x50, 0x42, 0x4d, 0x65, 0x74, 0x61, 0x64, 0x61, 0x74, 0x61, 0xea, 0x02, 0x08, 0x52, 0x65, 0x67,
	0x69, 0x73, 0x74, 0x72, 0x79, 0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_registry_ibc_proto_rawDescOnce sync.Once
	file_registry_ibc_proto_rawDescData = file_registry_ibc_proto_rawDesc
)

func file_registry_ibc_proto_rawDescGZIP() []byte {
	file_registry_ibc_proto_rawDescOnce.Do(func() {
		file_registry_ibc_proto_rawDescData = protoimpl.X.CompressGZIP(file_registry_ibc_proto_rawDescData)
	})
	return file_registry_ibc_proto_rawDescData
}

var file_registry_ibc_proto_msgTypes = make([]protoimpl.MessageInfo, 5)
var file_registry_ibc_proto_goTypes = []interface{}{
	(*IBCChain)(nil),                // 0: registry.IBCChain
	(*ChannelData)(nil),             // 1: registry.ChannelData
	(*IBCData)(nil),                 // 2: registry.IBCData
	(*ChannelData_ChannelPort)(nil), // 3: registry.ChannelData.ChannelPort
	(*ChannelData_Tags)(nil),        // 4: registry.ChannelData.Tags
}
var file_registry_ibc_proto_depIdxs = []int32{
	3, // 0: registry.ChannelData.chain_1:type_name -> registry.ChannelData.ChannelPort
	3, // 1: registry.ChannelData.chain_2:type_name -> registry.ChannelData.ChannelPort
	4, // 2: registry.ChannelData.tags:type_name -> registry.ChannelData.Tags
	0, // 3: registry.IBCData.chain_1:type_name -> registry.IBCChain
	0, // 4: registry.IBCData.chain_2:type_name -> registry.IBCChain
	1, // 5: registry.IBCData.channels:type_name -> registry.ChannelData
	6, // [6:6] is the sub-list for method output_type
	6, // [6:6] is the sub-list for method input_type
	6, // [6:6] is the sub-list for extension type_name
	6, // [6:6] is the sub-list for extension extendee
	0, // [0:6] is the sub-list for field type_name
}

func init() { file_registry_ibc_proto_init() }
func file_registry_ibc_proto_init() {
	if File_registry_ibc_proto != nil {
		return
	}
	if !protoimpl.UnsafeEnabled {
		file_registry_ibc_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*IBCChain); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_registry_ibc_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ChannelData); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_registry_ibc_proto_msgTypes[2].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*IBCData); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_registry_ibc_proto_msgTypes[3].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ChannelData_ChannelPort); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_registry_ibc_proto_msgTypes[4].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ChannelData_Tags); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_registry_ibc_proto_rawDesc,
			NumEnums:      0,
			NumMessages:   5,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_registry_ibc_proto_goTypes,
		DependencyIndexes: file_registry_ibc_proto_depIdxs,
		MessageInfos:      file_registry_ibc_proto_msgTypes,
	}.Build()
	File_registry_ibc_proto = out.File
	file_registry_ibc_proto_rawDesc = nil
	file_registry_ibc_proto_goTypes = nil
	file_registry_ibc_proto_depIdxs = nil
}
