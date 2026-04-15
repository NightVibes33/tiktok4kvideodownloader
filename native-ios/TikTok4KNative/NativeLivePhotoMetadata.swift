import AVFoundation
import CoreMedia
import Foundation

enum NativeLivePhotoMetadata {
    static func contentIdentifierMetadataItem(for assetIdentifier: String) -> AVMetadataItem {
        let item = AVMutableMetadataItem()
        item.keySpace = .quickTimeMetadata
        item.key = ("com.apple.quicktime" + ".content.identifier") as NSString
        item.value = assetIdentifier as NSString
        item.dataType = kCMMetadataBaseDataType_UTF8 as String
        return item
    }

    static func stillImageTimeMetadataAdaptor() throws -> AVAssetWriterInputMetadataAdaptor {
        let identifier = "mdta/com.apple.quicktime" + ".still-image-time"
        let spec: NSDictionary = [
            kCMMetadataFormatDescriptionMetadataSpecificationKey_Identifier as NSString: identifier,
            kCMMetadataFormatDescriptionMetadataSpecificationKey_DataType as NSString: kCMMetadataBaseDataType_SInt8 as String,
        ]

        var description: CMFormatDescription?
        let status = CMMetadataFormatDescriptionCreateWithMetadataSpecifications(
            allocator: kCFAllocatorDefault,
            metadataType: kCMMetadataFormatType_Boxed,
            metadataSpecifications: [spec] as CFArray,
            formatDescriptionOut: &description
        )

        guard status == noErr, let description else { throw NativeSlideshowSaveError.metadataFailed }
        let input = AVAssetWriterInput(mediaType: .metadata, outputSettings: nil, sourceFormatHint: description)
        return AVAssetWriterInputMetadataAdaptor(assetWriterInput: input)
    }

    static func stillImageTimeMetadataItem() -> AVMetadataItem {
        let item = AVMutableMetadataItem()
        item.keySpace = .quickTimeMetadata
        item.key = ("com.apple.quicktime" + ".still-image-time") as NSString
        item.value = 0 as NSNumber
        item.dataType = kCMMetadataBaseDataType_SInt8 as String
        return item
    }
}
