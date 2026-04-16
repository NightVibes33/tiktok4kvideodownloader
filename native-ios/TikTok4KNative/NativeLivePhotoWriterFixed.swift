@preconcurrency import AVFoundation
import CoreMedia
import Foundation
import Photos

enum NativeLivePhotoWriter {
    static func appendSamples(from output: AVAssetReaderOutput, to input: AVAssetWriterInput, writer: AVAssetWriter) throws {
        while let sampleBuffer = output.copyNextSampleBuffer() {
            guard input.append(sampleBuffer) else {
                throw NativeSlideshowSaveError.writerFailed(writer.error?.localizedDescription ?? "The writer could not append media samples.")
            }
        }
        input.markAsFinished()
    }

    static func finishWriting(_ writer: AVAssetWriter) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            writer.finishWriting {
                if let error = writer.error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: ())
                }
            }
        }
    }

    static func makeLivePhotoVideoFile(from remoteString: String, assetIdentifier: String) async throws -> URL {
        let inputURL = try await NativeSlideshowImageSupport.downloadRemoteFile(from: remoteString, suggestedExtension: "mov")
        defer { try? FileManager.default.removeItem(at: inputURL) }

        let asset = AVURLAsset(url: inputURL)
        guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
            throw NativeSlideshowSaveError.missingVideoTrack
        }
        let videoFormatDescriptions = try await videoTrack.load(.formatDescriptions)

        let reader = try AVAssetReader(asset: asset)
        let videoOutput = AVAssetReaderTrackOutput(track: videoTrack, outputSettings: nil)
        videoOutput.alwaysCopiesSampleData = false
        guard reader.canAdd(videoOutput) else {
            throw NativeSlideshowSaveError.readerFailed("The reader could not add the video track.")
        }
        reader.add(videoOutput)

        var audioOutput: AVAssetReaderTrackOutput?
        var audioFormatDescriptions: [Any] = []
        if let audioTrack = try await asset.loadTracks(withMediaType: .audio).first {
            audioFormatDescriptions = try await audioTrack.load(.formatDescriptions)
            let possibleAudioOutput = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: nil)
            possibleAudioOutput.alwaysCopiesSampleData = false
            if reader.canAdd(possibleAudioOutput) {
                reader.add(possibleAudioOutput)
                audioOutput = possibleAudioOutput
            }
        }

        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mov")
        if FileManager.default.fileExists(atPath: outputURL.path) {
            try FileManager.default.removeItem(at: outputURL)
        }

        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mov)
        writer.metadata = [NativeLivePhotoMetadata.contentIdentifierMetadataItem(for: assetIdentifier)]

        let videoInput = AVAssetWriterInput(
            mediaType: .video,
            outputSettings: nil,
            sourceFormatHint: videoFormatDescriptions.first as! CMFormatDescription
        )
        videoInput.expectsMediaDataInRealTime = false
        guard writer.canAdd(videoInput) else {
            throw NativeSlideshowSaveError.writerFailed("The writer could not add the video input.")
        }
        writer.add(videoInput)

        var audioInput: AVAssetWriterInput?
        if !audioFormatDescriptions.isEmpty {
            let possibleAudioInput = AVAssetWriterInput(
                mediaType: .audio,
                outputSettings: nil,
                sourceFormatHint: audioFormatDescriptions.first as! CMFormatDescription
            )
            possibleAudioInput.expectsMediaDataInRealTime = false
            if writer.canAdd(possibleAudioInput) {
                writer.add(possibleAudioInput)
                audioInput = possibleAudioInput
            }
        }

        let metadataAdaptor = try NativeLivePhotoMetadata.stillImageTimeMetadataAdaptor()
        guard writer.canAdd(metadataAdaptor.assetWriterInput) else {
            throw NativeSlideshowSaveError.metadataFailed
        }
        writer.add(metadataAdaptor.assetWriterInput)

        guard writer.startWriting() else {
            throw NativeSlideshowSaveError.writerFailed(writer.error?.localizedDescription ?? "The writer could not start.")
        }
        guard reader.startReading() else {
            throw NativeSlideshowSaveError.readerFailed(reader.error?.localizedDescription ?? "The reader could not start.")
        }

        writer.startSession(atSourceTime: .zero)
        try appendSamples(from: videoOutput, to: videoInput, writer: writer)
        if let audioOutput, let audioInput {
            try appendSamples(from: audioOutput, to: audioInput, writer: writer)
        }

        let metadataGroup = AVTimedMetadataGroup(
            items: [NativeLivePhotoMetadata.stillImageTimeMetadataItem()],
            timeRange: CMTimeRange(start: .zero, duration: CMTime(value: 1, timescale: 30))
        )
        guard metadataAdaptor.append(metadataGroup) else {
            throw NativeSlideshowSaveError.metadataFailed
        }
        metadataAdaptor.assetWriterInput.markAsFinished()
        try await finishWriting(writer)

        if reader.status == .failed {
            throw NativeSlideshowSaveError.readerFailed(reader.error?.localizedDescription ?? "The reader failed during export.")
        }
        if writer.status != .completed {
            throw NativeSlideshowSaveError.writerFailed(writer.error?.localizedDescription ?? "The writer did not finish the Live Photo movie.")
        }

        return outputURL
    }

    static func saveLivePhoto(imageRemoteString: String, videoRemoteString: String) async throws {
        try await NativeSlideshowImageSupport.requestAddOnlyAuthorization()
        let assetIdentifier = UUID().uuidString
        let imageURL = try await NativeSlideshowImageSupport.makeJPEGPhotoFile(from: imageRemoteString, assetIdentifier: assetIdentifier)
        let videoURL = try await makeLivePhotoVideoFile(from: videoRemoteString, assetIdentifier: assetIdentifier)
        defer {
            try? FileManager.default.removeItem(at: imageURL)
            try? FileManager.default.removeItem(at: videoURL)
        }

        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                PHPhotoLibrary.shared().performChanges({
                    let request = PHAssetCreationRequest.forAsset()
                    let photoOptions = PHAssetResourceCreationOptions()
                    photoOptions.originalFilename = imageURL.lastPathComponent
                    request.addResource(with: .photo, fileURL: imageURL, options: photoOptions)

                    let videoOptions = PHAssetResourceCreationOptions()
                    videoOptions.originalFilename = videoURL.lastPathComponent
                    request.addResource(with: .pairedVideo, fileURL: videoURL, options: videoOptions)
                }, completionHandler: { success, error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else if success {
                        continuation.resume(returning: ())
                    } else {
                        continuation.resume(throwing: NativeSlideshowSaveError.livePhotoPairRejected)
                    }
                })
            }
        } catch let error as NSError where error.domain == "PHPhotosErrorDomain" {
            throw NativeSlideshowSaveError.livePhotoPairRejected
        }
    }
}
