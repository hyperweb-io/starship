// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.33.0
// 	protoc        (unknown)
// source: faucet/service.proto

package faucet

import (
	_ "google.golang.org/genproto/googleapis/api/annotations"
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	_ "google.golang.org/protobuf/types/descriptorpb"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type RequestCredit struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Denom   string `protobuf:"bytes,1,opt,name=denom,proto3" json:"denom,omitempty"`
	Address string `protobuf:"bytes,2,opt,name=address,proto3" json:"address,omitempty"`
}

func (x *RequestCredit) Reset() {
	*x = RequestCredit{}
	if protoimpl.UnsafeEnabled {
		mi := &file_faucet_service_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *RequestCredit) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*RequestCredit) ProtoMessage() {}

func (x *RequestCredit) ProtoReflect() protoreflect.Message {
	mi := &file_faucet_service_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use RequestCredit.ProtoReflect.Descriptor instead.
func (*RequestCredit) Descriptor() ([]byte, []int) {
	return file_faucet_service_proto_rawDescGZIP(), []int{0}
}

func (x *RequestCredit) GetDenom() string {
	if x != nil {
		return x.Denom
	}
	return ""
}

func (x *RequestCredit) GetAddress() string {
	if x != nil {
		return x.Address
	}
	return ""
}

type ResponseCredit struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Status string `protobuf:"bytes,1,opt,name=status,proto3" json:"status,omitempty"`
}

func (x *ResponseCredit) Reset() {
	*x = ResponseCredit{}
	if protoimpl.UnsafeEnabled {
		mi := &file_faucet_service_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ResponseCredit) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ResponseCredit) ProtoMessage() {}

func (x *ResponseCredit) ProtoReflect() protoreflect.Message {
	mi := &file_faucet_service_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ResponseCredit.ProtoReflect.Descriptor instead.
func (*ResponseCredit) Descriptor() ([]byte, []int) {
	return file_faucet_service_proto_rawDescGZIP(), []int{1}
}

func (x *ResponseCredit) GetStatus() string {
	if x != nil {
		return x.Status
	}
	return ""
}

var File_faucet_service_proto protoreflect.FileDescriptor

var file_faucet_service_proto_rawDesc = []byte{
	0x0a, 0x14, 0x66, 0x61, 0x75, 0x63, 0x65, 0x74, 0x2f, 0x73, 0x65, 0x72, 0x76, 0x69, 0x63, 0x65,
	0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x06, 0x66, 0x61, 0x75, 0x63, 0x65, 0x74, 0x1a, 0x1c,
	0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x2f, 0x61, 0x70, 0x69, 0x2f, 0x61, 0x6e, 0x6e, 0x6f, 0x74,
	0x61, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x1a, 0x1b, 0x67, 0x6f,
	0x6f, 0x67, 0x6c, 0x65, 0x2f, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x75, 0x66, 0x2f, 0x65, 0x6d,
	0x70, 0x74, 0x79, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x1a, 0x20, 0x67, 0x6f, 0x6f, 0x67, 0x6c,
	0x65, 0x2f, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x75, 0x66, 0x2f, 0x64, 0x65, 0x73, 0x63, 0x72,
	0x69, 0x70, 0x74, 0x6f, 0x72, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x1a, 0x13, 0x66, 0x61, 0x75,
	0x63, 0x65, 0x74, 0x2f, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f,
	0x22, 0x3f, 0x0a, 0x0d, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x43, 0x72, 0x65, 0x64, 0x69,
	0x74, 0x12, 0x14, 0x0a, 0x05, 0x64, 0x65, 0x6e, 0x6f, 0x6d, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x05, 0x64, 0x65, 0x6e, 0x6f, 0x6d, 0x12, 0x18, 0x0a, 0x07, 0x61, 0x64, 0x64, 0x72, 0x65,
	0x73, 0x73, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x61, 0x64, 0x64, 0x72, 0x65, 0x73,
	0x73, 0x22, 0x28, 0x0a, 0x0e, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x43, 0x72, 0x65,
	0x64, 0x69, 0x74, 0x12, 0x16, 0x0a, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x18, 0x01, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x32, 0x97, 0x01, 0x0a, 0x06,
	0x46, 0x61, 0x75, 0x63, 0x65, 0x74, 0x12, 0x40, 0x0a, 0x06, 0x53, 0x74, 0x61, 0x74, 0x75, 0x73,
	0x12, 0x16, 0x2e, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62,
	0x75, 0x66, 0x2e, 0x45, 0x6d, 0x70, 0x74, 0x79, 0x1a, 0x0d, 0x2e, 0x66, 0x61, 0x75, 0x63, 0x65,
	0x74, 0x2e, 0x53, 0x74, 0x61, 0x74, 0x65, 0x22, 0x0f, 0x82, 0xd3, 0xe4, 0x93, 0x02, 0x09, 0x12,
	0x07, 0x2f, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x12, 0x4b, 0x0a, 0x06, 0x43, 0x72, 0x65, 0x64,
	0x69, 0x74, 0x12, 0x15, 0x2e, 0x66, 0x61, 0x75, 0x63, 0x65, 0x74, 0x2e, 0x52, 0x65, 0x71, 0x75,
	0x65, 0x73, 0x74, 0x43, 0x72, 0x65, 0x64, 0x69, 0x74, 0x1a, 0x16, 0x2e, 0x66, 0x61, 0x75, 0x63,
	0x65, 0x74, 0x2e, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x43, 0x72, 0x65, 0x64, 0x69,
	0x74, 0x22, 0x12, 0x82, 0xd3, 0xe4, 0x93, 0x02, 0x0c, 0x3a, 0x01, 0x2a, 0x22, 0x07, 0x2f, 0x63,
	0x72, 0x65, 0x64, 0x69, 0x74, 0x42, 0x7d, 0x0a, 0x0a, 0x63, 0x6f, 0x6d, 0x2e, 0x66, 0x61, 0x75,
	0x63, 0x65, 0x74, 0x42, 0x0c, 0x53, 0x65, 0x72, 0x76, 0x69, 0x63, 0x65, 0x50, 0x72, 0x6f, 0x74,
	0x6f, 0x50, 0x01, 0x5a, 0x29, 0x67, 0x69, 0x74, 0x68, 0x75, 0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2f,
	0x63, 0x6f, 0x73, 0x6d, 0x6f, 0x6c, 0x6f, 0x67, 0x79, 0x2d, 0x74, 0x65, 0x63, 0x68, 0x2f, 0x73,
	0x74, 0x61, 0x72, 0x73, 0x68, 0x69, 0x70, 0x2f, 0x66, 0x61, 0x75, 0x63, 0x65, 0x74, 0xa2, 0x02,
	0x03, 0x46, 0x58, 0x58, 0xaa, 0x02, 0x06, 0x46, 0x61, 0x75, 0x63, 0x65, 0x74, 0xca, 0x02, 0x06,
	0x46, 0x61, 0x75, 0x63, 0x65, 0x74, 0xe2, 0x02, 0x12, 0x46, 0x61, 0x75, 0x63, 0x65, 0x74, 0x5c,
	0x47, 0x50, 0x42, 0x4d, 0x65, 0x74, 0x61, 0x64, 0x61, 0x74, 0x61, 0xea, 0x02, 0x06, 0x46, 0x61,
	0x75, 0x63, 0x65, 0x74, 0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_faucet_service_proto_rawDescOnce sync.Once
	file_faucet_service_proto_rawDescData = file_faucet_service_proto_rawDesc
)

func file_faucet_service_proto_rawDescGZIP() []byte {
	file_faucet_service_proto_rawDescOnce.Do(func() {
		file_faucet_service_proto_rawDescData = protoimpl.X.CompressGZIP(file_faucet_service_proto_rawDescData)
	})
	return file_faucet_service_proto_rawDescData
}

var file_faucet_service_proto_msgTypes = make([]protoimpl.MessageInfo, 2)
var file_faucet_service_proto_goTypes = []interface{}{
	(*RequestCredit)(nil),  // 0: faucet.RequestCredit
	(*ResponseCredit)(nil), // 1: faucet.ResponseCredit
	(*emptypb.Empty)(nil),  // 2: google.protobuf.Empty
	(*State)(nil),          // 3: faucet.State
}
var file_faucet_service_proto_depIdxs = []int32{
	2, // 0: faucet.Faucet.Status:input_type -> google.protobuf.Empty
	0, // 1: faucet.Faucet.Credit:input_type -> faucet.RequestCredit
	3, // 2: faucet.Faucet.Status:output_type -> faucet.State
	1, // 3: faucet.Faucet.Credit:output_type -> faucet.ResponseCredit
	2, // [2:4] is the sub-list for method output_type
	0, // [0:2] is the sub-list for method input_type
	0, // [0:0] is the sub-list for extension type_name
	0, // [0:0] is the sub-list for extension extendee
	0, // [0:0] is the sub-list for field type_name
}

func init() { file_faucet_service_proto_init() }
func file_faucet_service_proto_init() {
	if File_faucet_service_proto != nil {
		return
	}
	file_faucet_status_proto_init()
	if !protoimpl.UnsafeEnabled {
		file_faucet_service_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*RequestCredit); i {
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
		file_faucet_service_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ResponseCredit); i {
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
			RawDescriptor: file_faucet_service_proto_rawDesc,
			NumEnums:      0,
			NumMessages:   2,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_faucet_service_proto_goTypes,
		DependencyIndexes: file_faucet_service_proto_depIdxs,
		MessageInfos:      file_faucet_service_proto_msgTypes,
	}.Build()
	File_faucet_service_proto = out.File
	file_faucet_service_proto_rawDesc = nil
	file_faucet_service_proto_goTypes = nil
	file_faucet_service_proto_depIdxs = nil
}
