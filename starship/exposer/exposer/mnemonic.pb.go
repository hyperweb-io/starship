// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.36.4
// 	protoc        (unknown)
// source: exposer/mnemonic.proto

package exposer

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
	unsafe "unsafe"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type Mnemonic struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Name          string                 `protobuf:"bytes,1,opt,name=name,proto3" json:"name,omitempty"`
	Type          string                 `protobuf:"bytes,2,opt,name=type,proto3" json:"type,omitempty"`
	Mnemonic      string                 `protobuf:"bytes,3,opt,name=mnemonic,proto3" json:"mnemonic,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Mnemonic) Reset() {
	*x = Mnemonic{}
	mi := &file_exposer_mnemonic_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Mnemonic) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Mnemonic) ProtoMessage() {}

func (x *Mnemonic) ProtoReflect() protoreflect.Message {
	mi := &file_exposer_mnemonic_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Mnemonic.ProtoReflect.Descriptor instead.
func (*Mnemonic) Descriptor() ([]byte, []int) {
	return file_exposer_mnemonic_proto_rawDescGZIP(), []int{0}
}

func (x *Mnemonic) GetName() string {
	if x != nil {
		return x.Name
	}
	return ""
}

func (x *Mnemonic) GetType() string {
	if x != nil {
		return x.Type
	}
	return ""
}

func (x *Mnemonic) GetMnemonic() string {
	if x != nil {
		return x.Mnemonic
	}
	return ""
}

type Keys struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Genesis       []*Mnemonic            `protobuf:"bytes,1,rep,name=genesis,proto3" json:"genesis,omitempty"`
	Validators    []*Mnemonic            `protobuf:"bytes,2,rep,name=validators,proto3" json:"validators,omitempty"`
	Keys          []*Mnemonic            `protobuf:"bytes,3,rep,name=keys,proto3" json:"keys,omitempty"`
	Relayers      []*Mnemonic            `protobuf:"bytes,4,rep,name=relayers,proto3" json:"relayers,omitempty"`
	Faucet        []*Mnemonic            `protobuf:"bytes,5,rep,name=faucet,proto3" json:"faucet,omitempty"`
	RelayersCli   []*Mnemonic            `protobuf:"bytes,6,rep,name=relayers_cli,json=relayersCli,proto3" json:"relayers_cli,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Keys) Reset() {
	*x = Keys{}
	mi := &file_exposer_mnemonic_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Keys) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Keys) ProtoMessage() {}

func (x *Keys) ProtoReflect() protoreflect.Message {
	mi := &file_exposer_mnemonic_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Keys.ProtoReflect.Descriptor instead.
func (*Keys) Descriptor() ([]byte, []int) {
	return file_exposer_mnemonic_proto_rawDescGZIP(), []int{1}
}

func (x *Keys) GetGenesis() []*Mnemonic {
	if x != nil {
		return x.Genesis
	}
	return nil
}

func (x *Keys) GetValidators() []*Mnemonic {
	if x != nil {
		return x.Validators
	}
	return nil
}

func (x *Keys) GetKeys() []*Mnemonic {
	if x != nil {
		return x.Keys
	}
	return nil
}

func (x *Keys) GetRelayers() []*Mnemonic {
	if x != nil {
		return x.Relayers
	}
	return nil
}

func (x *Keys) GetFaucet() []*Mnemonic {
	if x != nil {
		return x.Faucet
	}
	return nil
}

func (x *Keys) GetRelayersCli() []*Mnemonic {
	if x != nil {
		return x.RelayersCli
	}
	return nil
}

type TypeKey struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Type          string                 `protobuf:"bytes,1,opt,name=type,proto3" json:"type,omitempty"`
	Value         string                 `protobuf:"bytes,2,opt,name=value,proto3" json:"value,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *TypeKey) Reset() {
	*x = TypeKey{}
	mi := &file_exposer_mnemonic_proto_msgTypes[2]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *TypeKey) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*TypeKey) ProtoMessage() {}

func (x *TypeKey) ProtoReflect() protoreflect.Message {
	mi := &file_exposer_mnemonic_proto_msgTypes[2]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use TypeKey.ProtoReflect.Descriptor instead.
func (*TypeKey) Descriptor() ([]byte, []int) {
	return file_exposer_mnemonic_proto_rawDescGZIP(), []int{2}
}

func (x *TypeKey) GetType() string {
	if x != nil {
		return x.Type
	}
	return ""
}

func (x *TypeKey) GetValue() string {
	if x != nil {
		return x.Value
	}
	return ""
}

type PrivValidatorKey struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Address       string                 `protobuf:"bytes,1,opt,name=address,proto3" json:"address,omitempty"`
	PubKey        *TypeKey               `protobuf:"bytes,2,opt,name=pub_key,proto3" json:"pub_key,omitempty"`
	PrivKey       *TypeKey               `protobuf:"bytes,3,opt,name=priv_key,proto3" json:"priv_key,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *PrivValidatorKey) Reset() {
	*x = PrivValidatorKey{}
	mi := &file_exposer_mnemonic_proto_msgTypes[3]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *PrivValidatorKey) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*PrivValidatorKey) ProtoMessage() {}

func (x *PrivValidatorKey) ProtoReflect() protoreflect.Message {
	mi := &file_exposer_mnemonic_proto_msgTypes[3]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use PrivValidatorKey.ProtoReflect.Descriptor instead.
func (*PrivValidatorKey) Descriptor() ([]byte, []int) {
	return file_exposer_mnemonic_proto_rawDescGZIP(), []int{3}
}

func (x *PrivValidatorKey) GetAddress() string {
	if x != nil {
		return x.Address
	}
	return ""
}

func (x *PrivValidatorKey) GetPubKey() *TypeKey {
	if x != nil {
		return x.PubKey
	}
	return nil
}

func (x *PrivValidatorKey) GetPrivKey() *TypeKey {
	if x != nil {
		return x.PrivKey
	}
	return nil
}

type NodeKey struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	PrivKey       *TypeKey               `protobuf:"bytes,1,opt,name=priv_key,proto3" json:"priv_key,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *NodeKey) Reset() {
	*x = NodeKey{}
	mi := &file_exposer_mnemonic_proto_msgTypes[4]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *NodeKey) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*NodeKey) ProtoMessage() {}

func (x *NodeKey) ProtoReflect() protoreflect.Message {
	mi := &file_exposer_mnemonic_proto_msgTypes[4]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use NodeKey.ProtoReflect.Descriptor instead.
func (*NodeKey) Descriptor() ([]byte, []int) {
	return file_exposer_mnemonic_proto_rawDescGZIP(), []int{4}
}

func (x *NodeKey) GetPrivKey() *TypeKey {
	if x != nil {
		return x.PrivKey
	}
	return nil
}

var File_exposer_mnemonic_proto protoreflect.FileDescriptor

var file_exposer_mnemonic_proto_rawDesc = string([]byte{
	0x0a, 0x16, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x2f, 0x6d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e,
	0x69, 0x63, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x07, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65,
	0x72, 0x22, 0x4e, 0x0a, 0x08, 0x4d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e, 0x69, 0x63, 0x12, 0x12, 0x0a,
	0x04, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x04, 0x6e, 0x61, 0x6d,
	0x65, 0x12, 0x12, 0x0a, 0x04, 0x74, 0x79, 0x70, 0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x04, 0x74, 0x79, 0x70, 0x65, 0x12, 0x1a, 0x0a, 0x08, 0x6d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e, 0x69,
	0x63, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x08, 0x6d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e, 0x69,
	0x63, 0x22, 0x9d, 0x02, 0x0a, 0x04, 0x4b, 0x65, 0x79, 0x73, 0x12, 0x2b, 0x0a, 0x07, 0x67, 0x65,
	0x6e, 0x65, 0x73, 0x69, 0x73, 0x18, 0x01, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x11, 0x2e, 0x65, 0x78,
	0x70, 0x6f, 0x73, 0x65, 0x72, 0x2e, 0x4d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e, 0x69, 0x63, 0x52, 0x07,
	0x67, 0x65, 0x6e, 0x65, 0x73, 0x69, 0x73, 0x12, 0x31, 0x0a, 0x0a, 0x76, 0x61, 0x6c, 0x69, 0x64,
	0x61, 0x74, 0x6f, 0x72, 0x73, 0x18, 0x02, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x11, 0x2e, 0x65, 0x78,
	0x70, 0x6f, 0x73, 0x65, 0x72, 0x2e, 0x4d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e, 0x69, 0x63, 0x52, 0x0a,
	0x76, 0x61, 0x6c, 0x69, 0x64, 0x61, 0x74, 0x6f, 0x72, 0x73, 0x12, 0x25, 0x0a, 0x04, 0x6b, 0x65,
	0x79, 0x73, 0x18, 0x03, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x11, 0x2e, 0x65, 0x78, 0x70, 0x6f, 0x73,
	0x65, 0x72, 0x2e, 0x4d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e, 0x69, 0x63, 0x52, 0x04, 0x6b, 0x65, 0x79,
	0x73, 0x12, 0x2d, 0x0a, 0x08, 0x72, 0x65, 0x6c, 0x61, 0x79, 0x65, 0x72, 0x73, 0x18, 0x04, 0x20,
	0x03, 0x28, 0x0b, 0x32, 0x11, 0x2e, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x2e, 0x4d, 0x6e,
	0x65, 0x6d, 0x6f, 0x6e, 0x69, 0x63, 0x52, 0x08, 0x72, 0x65, 0x6c, 0x61, 0x79, 0x65, 0x72, 0x73,
	0x12, 0x29, 0x0a, 0x06, 0x66, 0x61, 0x75, 0x63, 0x65, 0x74, 0x18, 0x05, 0x20, 0x03, 0x28, 0x0b,
	0x32, 0x11, 0x2e, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x2e, 0x4d, 0x6e, 0x65, 0x6d, 0x6f,
	0x6e, 0x69, 0x63, 0x52, 0x06, 0x66, 0x61, 0x75, 0x63, 0x65, 0x74, 0x12, 0x34, 0x0a, 0x0c, 0x72,
	0x65, 0x6c, 0x61, 0x79, 0x65, 0x72, 0x73, 0x5f, 0x63, 0x6c, 0x69, 0x18, 0x06, 0x20, 0x03, 0x28,
	0x0b, 0x32, 0x11, 0x2e, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x2e, 0x4d, 0x6e, 0x65, 0x6d,
	0x6f, 0x6e, 0x69, 0x63, 0x52, 0x0b, 0x72, 0x65, 0x6c, 0x61, 0x79, 0x65, 0x72, 0x73, 0x43, 0x6c,
	0x69, 0x22, 0x33, 0x0a, 0x07, 0x54, 0x79, 0x70, 0x65, 0x4b, 0x65, 0x79, 0x12, 0x12, 0x0a, 0x04,
	0x74, 0x79, 0x70, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x04, 0x74, 0x79, 0x70, 0x65,
	0x12, 0x14, 0x0a, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x22, 0x86, 0x01, 0x0a, 0x10, 0x50, 0x72, 0x69, 0x76, 0x56,
	0x61, 0x6c, 0x69, 0x64, 0x61, 0x74, 0x6f, 0x72, 0x4b, 0x65, 0x79, 0x12, 0x18, 0x0a, 0x07, 0x61,
	0x64, 0x64, 0x72, 0x65, 0x73, 0x73, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x61, 0x64,
	0x64, 0x72, 0x65, 0x73, 0x73, 0x12, 0x2a, 0x0a, 0x07, 0x70, 0x75, 0x62, 0x5f, 0x6b, 0x65, 0x79,
	0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x10, 0x2e, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72,
	0x2e, 0x54, 0x79, 0x70, 0x65, 0x4b, 0x65, 0x79, 0x52, 0x07, 0x70, 0x75, 0x62, 0x5f, 0x6b, 0x65,
	0x79, 0x12, 0x2c, 0x0a, 0x08, 0x70, 0x72, 0x69, 0x76, 0x5f, 0x6b, 0x65, 0x79, 0x18, 0x03, 0x20,
	0x01, 0x28, 0x0b, 0x32, 0x10, 0x2e, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x2e, 0x54, 0x79,
	0x70, 0x65, 0x4b, 0x65, 0x79, 0x52, 0x08, 0x70, 0x72, 0x69, 0x76, 0x5f, 0x6b, 0x65, 0x79, 0x22,
	0x37, 0x0a, 0x07, 0x4e, 0x6f, 0x64, 0x65, 0x4b, 0x65, 0x79, 0x12, 0x2c, 0x0a, 0x08, 0x70, 0x72,
	0x69, 0x76, 0x5f, 0x6b, 0x65, 0x79, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x10, 0x2e, 0x65,
	0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x2e, 0x54, 0x79, 0x70, 0x65, 0x4b, 0x65, 0x79, 0x52, 0x08,
	0x70, 0x72, 0x69, 0x76, 0x5f, 0x6b, 0x65, 0x79, 0x42, 0x81, 0x01, 0x0a, 0x0b, 0x63, 0x6f, 0x6d,
	0x2e, 0x65, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x42, 0x0d, 0x4d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e,
	0x69, 0x63, 0x50, 0x72, 0x6f, 0x74, 0x6f, 0x50, 0x01, 0x5a, 0x27, 0x67, 0x69, 0x74, 0x68, 0x75,
	0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2f, 0x68, 0x79, 0x70, 0x65, 0x72, 0x77, 0x65, 0x62, 0x2d, 0x69,
	0x6f, 0x2f, 0x73, 0x74, 0x61, 0x72, 0x73, 0x68, 0x69, 0x70, 0x2f, 0x65, 0x78, 0x70, 0x6f, 0x73,
	0x65, 0x72, 0xa2, 0x02, 0x03, 0x45, 0x58, 0x58, 0xaa, 0x02, 0x07, 0x45, 0x78, 0x70, 0x6f, 0x73,
	0x65, 0x72, 0xca, 0x02, 0x07, 0x45, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0xe2, 0x02, 0x13, 0x45,
	0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x5c, 0x47, 0x50, 0x42, 0x4d, 0x65, 0x74, 0x61, 0x64, 0x61,
	0x74, 0x61, 0xea, 0x02, 0x07, 0x45, 0x78, 0x70, 0x6f, 0x73, 0x65, 0x72, 0x62, 0x06, 0x70, 0x72,
	0x6f, 0x74, 0x6f, 0x33,
})

var (
	file_exposer_mnemonic_proto_rawDescOnce sync.Once
	file_exposer_mnemonic_proto_rawDescData []byte
)

func file_exposer_mnemonic_proto_rawDescGZIP() []byte {
	file_exposer_mnemonic_proto_rawDescOnce.Do(func() {
		file_exposer_mnemonic_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_exposer_mnemonic_proto_rawDesc), len(file_exposer_mnemonic_proto_rawDesc)))
	})
	return file_exposer_mnemonic_proto_rawDescData
}

var file_exposer_mnemonic_proto_msgTypes = make([]protoimpl.MessageInfo, 5)
var file_exposer_mnemonic_proto_goTypes = []any{
	(*Mnemonic)(nil),         // 0: exposer.Mnemonic
	(*Keys)(nil),             // 1: exposer.Keys
	(*TypeKey)(nil),          // 2: exposer.TypeKey
	(*PrivValidatorKey)(nil), // 3: exposer.PrivValidatorKey
	(*NodeKey)(nil),          // 4: exposer.NodeKey
}
var file_exposer_mnemonic_proto_depIdxs = []int32{
	0, // 0: exposer.Keys.genesis:type_name -> exposer.Mnemonic
	0, // 1: exposer.Keys.validators:type_name -> exposer.Mnemonic
	0, // 2: exposer.Keys.keys:type_name -> exposer.Mnemonic
	0, // 3: exposer.Keys.relayers:type_name -> exposer.Mnemonic
	0, // 4: exposer.Keys.faucet:type_name -> exposer.Mnemonic
	0, // 5: exposer.Keys.relayers_cli:type_name -> exposer.Mnemonic
	2, // 6: exposer.PrivValidatorKey.pub_key:type_name -> exposer.TypeKey
	2, // 7: exposer.PrivValidatorKey.priv_key:type_name -> exposer.TypeKey
	2, // 8: exposer.NodeKey.priv_key:type_name -> exposer.TypeKey
	9, // [9:9] is the sub-list for method output_type
	9, // [9:9] is the sub-list for method input_type
	9, // [9:9] is the sub-list for extension type_name
	9, // [9:9] is the sub-list for extension extendee
	0, // [0:9] is the sub-list for field type_name
}

func init() { file_exposer_mnemonic_proto_init() }
func file_exposer_mnemonic_proto_init() {
	if File_exposer_mnemonic_proto != nil {
		return
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_exposer_mnemonic_proto_rawDesc), len(file_exposer_mnemonic_proto_rawDesc)),
			NumEnums:      0,
			NumMessages:   5,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_exposer_mnemonic_proto_goTypes,
		DependencyIndexes: file_exposer_mnemonic_proto_depIdxs,
		MessageInfos:      file_exposer_mnemonic_proto_msgTypes,
	}.Build()
	File_exposer_mnemonic_proto = out.File
	file_exposer_mnemonic_proto_goTypes = nil
	file_exposer_mnemonic_proto_depIdxs = nil
}
